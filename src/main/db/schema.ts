import { pgTable, text, timestamp, pgEnum } from 'drizzle-orm/pg-core'

// S3 Provider variants
export const s3VariantEnum = pgEnum('s3_variant', [
  'aws-s3',
  'aliyun-oss',
  'tencent-cos',
  'cloudflare-r2',
  'minio',
  'backblaze-b2'
])

// Provider types
export const providerTypeEnum = pgEnum('provider_type', ['s3-compatible', 'supabase-storage'])

// Providers table
export const providers = pgTable('providers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: providerTypeEnum('type').notNull(),

  // S3 fields
  variant: s3VariantEnum('variant'),
  accessKeyId: text('access_key_id'),
  secretAccessKey: text('secret_access_key'),
  region: text('region'),
  endpoint: text('endpoint'),
  bucket: text('bucket'),
  accountId: text('account_id'),

  // Supabase fields
  projectUrl: text('project_url'),
  anonKey: text('anon_key'),
  serviceRoleKey: text('service_role_key'),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

// Type exports
export type ProviderRecord = typeof providers.$inferSelect
export type NewProviderRecord = typeof providers.$inferInsert
