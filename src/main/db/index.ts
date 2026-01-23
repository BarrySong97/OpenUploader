import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { sql } from 'drizzle-orm'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import { app } from 'electron'
import path from 'path'
import { promises as fs } from 'fs'
import { is } from '@electron-toolkit/utils'
import * as schema from './schema'

export type Database = ReturnType<typeof drizzle<typeof schema>>

let db: Database | null = null

export function getDatabasePath(): string {
  const appEnv = (import.meta.env.VITE_APP_ENV || (is.dev ? 'dev' : 'prod')).toLowerCase()
  const dbName = `pglite-db-${appEnv}`
  return path.join(app.getPath('userData'), dbName)
}

async function runMigrations(database: Database, migrationsFolder: string): Promise<void> {
  const migrations = readMigrationFiles({ migrationsFolder })
  const session = database._.session
  const legacyTable = 'drizzle.__drizzle_migrations'
  const defaultTable = '__drizzle_migrations'

  let migrationTable = defaultTable
  let lastDbMigration: { created_at?: number } | undefined

  try {
    const legacyMigrations = await session.all(
      sql.raw(`select id, hash, created_at from ${legacyTable} order by created_at desc limit 1`)
    )
    if (legacyMigrations.length > 0) {
      migrationTable = legacyTable
      lastDbMigration = legacyMigrations[0] as { created_at?: number }
    }
  } catch {
    // Legacy schema not available in PGlite, fall back to default table
  }

  if (migrationTable === defaultTable) {
    await session.execute(
      sql.raw(
        'CREATE TABLE IF NOT EXISTS __drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)'
      )
    )
    const dbMigrations = await session.all(
      sql`select id, hash, created_at from __drizzle_migrations order by created_at desc limit 1`
    )
    lastDbMigration = dbMigrations[0] as { created_at?: number } | undefined
  }

  await session.transaction(async (tx) => {
    for (const migration of migrations) {
      if (!lastDbMigration || Number(lastDbMigration.created_at) < migration.folderMillis) {
        for (const stmt of migration.sql) {
          const trimmed = stmt.trim()
          if (!trimmed) continue
          await tx.execute(sql.raw(trimmed))
        }
        await tx.execute(
          sql`insert into ${sql.raw(migrationTable)} ("hash", "created_at") values(${migration.hash}, ${migration.folderMillis})`
        )
      }
    }
  })
}

export async function initDatabase(): Promise<Database> {
  const dbPath = getDatabasePath()
  await fs.mkdir(dbPath, { recursive: true })
  const client = new PGlite(dbPath)

  db = drizzle({ client, schema })

  // Get migrations folder path (different in dev vs production)
  const migrationsFolder = is.dev
    ? path.join(process.cwd(), 'drizzle')
    : path.join(process.resourcesPath, 'drizzle')

  // Run migrations
  await runMigrations(db, migrationsFolder)

  return db
}

export function getDatabase(): Database {
  if (!db) throw new Error('Database not initialized')
  return db
}

export { schema }
