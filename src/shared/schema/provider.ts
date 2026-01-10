import { z } from 'zod'

// S3 Provider variants
export const s3Variants = [
  'aws-s3',
  'aliyun-oss',
  'tencent-cos',
  'cloudflare-r2',
  'minio',
  'backblaze-b2'
] as const

export type S3Variant = (typeof s3Variants)[number]

// S3 兼容类 Provider
export const s3ProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.literal('s3-compatible'),
  variant: z.enum(s3Variants),
  accessKeyId: z.string(),
  secretAccessKey: z.string(),
  region: z.string().optional(),
  endpoint: z.string().optional(),
  bucket: z.string().optional(),
  accountId: z.string().optional(), // R2 专用
  createdAt: z.number(),
  updatedAt: z.number()
})

// Supabase Storage Provider
export const supabaseProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.literal('supabase-storage'),
  projectUrl: z.string(),
  anonKey: z.string().optional(),
  serviceRoleKey: z.string().optional(),
  bucket: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number()
})

export const providerSchema = z.discriminatedUnion('type', [
  s3ProviderSchema,
  supabaseProviderSchema
])

export type Provider = z.infer<typeof providerSchema>
export type S3Provider = z.infer<typeof s3ProviderSchema>
export type SupabaseProvider = z.infer<typeof supabaseProviderSchema>

// ============ Form Schemas (for react-hook-form) ============

// S3 Provider form schema (without id, createdAt, updatedAt)
export const addS3ProviderFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.literal('s3-compatible'),
  variant: z.enum(s3Variants, {
    message: 'Please select a provider type'
  }),
  accessKeyId: z.string().min(1, 'Access Key ID is required'),
  secretAccessKey: z.string().min(1, 'Secret Access Key is required'),
  region: z.string().optional(),
  endpoint: z.string().optional(),
  bucket: z.string().optional(),
  accountId: z.string().optional()
})

// Supabase Provider form schema (without id, createdAt, updatedAt)
export const addSupabaseProviderFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.literal('supabase-storage'),
  projectUrl: z.string().url('Please enter a valid URL'),
  anonKey: z.string().optional(),
  serviceRoleKey: z.string().optional(),
  bucket: z.string().optional()
})

// Combined form schema
export const addProviderFormSchema = z.discriminatedUnion('type', [
  addS3ProviderFormSchema,
  addSupabaseProviderFormSchema
])

export type AddS3ProviderForm = z.infer<typeof addS3ProviderFormSchema>
export type AddSupabaseProviderForm = z.infer<typeof addSupabaseProviderFormSchema>
export type AddProviderForm = z.infer<typeof addProviderFormSchema>
