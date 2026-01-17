import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import { app } from 'electron'
import path from 'path'
import { is } from '@electron-toolkit/utils'
import * as schema from './schema'

export type Database = ReturnType<typeof drizzle<typeof schema>>

let db: Database | null = null

export async function initDatabase(): Promise<Database> {
  const appEnv = process.env.APP_ENV ?? 'dev'
  const dbName = `pglite-db-${appEnv}`
  const dbPath = path.join(app.getPath('userData'), dbName)
  console.log('PGlite database path:', dbPath)
  const client = new PGlite(dbPath)

  db = drizzle({ client, schema })

  // Get migrations folder path (different in dev vs production)
  const migrationsFolder = is.dev
    ? path.join(process.cwd(), 'drizzle')
    : path.join(process.resourcesPath, 'drizzle')

  // Run migrations
  await migrate(db, { migrationsFolder })

  return db
}

export function getDatabase(): Database {
  if (!db) throw new Error('Database not initialized')
  return db
}

export { schema }
