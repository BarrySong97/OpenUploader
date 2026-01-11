import { z } from 'zod'
import { providerSchema } from '../provider'

// ============ Provider CRUD Schemas ============
export const createProviderInputSchema = providerSchema
export const deleteProviderInputSchema = z.object({ id: z.string() })
export const getProviderByIdInputSchema = z.object({ id: z.string() })

// ============ Provider Operations Schemas ============
export const listObjectsInputSchema = z.object({
  provider: providerSchema,
  bucket: z.string(),
  prefix: z.string().optional(),
  cursor: z.string().optional(),
  maxKeys: z.number().optional()
})

export const uploadFileInputSchema = z.object({
  provider: providerSchema,
  bucket: z.string(),
  key: z.string(),
  content: z.string(),
  contentType: z.string().optional()
})

export const createFolderInputSchema = z.object({
  provider: providerSchema,
  bucket: z.string(),
  path: z.string()
})

export const getObjectUrlInputSchema = z.object({
  provider: providerSchema,
  bucket: z.string(),
  key: z.string(),
  expiresIn: z.number().optional()
})

export const deleteObjectInputSchema = z.object({
  provider: providerSchema,
  bucket: z.string(),
  key: z.string(),
  isFolder: z.boolean().optional()
})

export const deleteObjectsInputSchema = z.object({
  provider: providerSchema,
  bucket: z.string(),
  keys: z.array(z.string())
})

export const renameObjectInputSchema = z.object({
  provider: providerSchema,
  bucket: z.string(),
  sourceKey: z.string(),
  newName: z.string()
})

export const moveObjectInputSchema = z.object({
  provider: providerSchema,
  bucket: z.string(),
  sourceKey: z.string(),
  destinationPrefix: z.string()
})

export const moveObjectsInputSchema = z.object({
  provider: providerSchema,
  bucket: z.string(),
  sourceKeys: z.array(z.string()),
  destinationPrefix: z.string()
})

// ============ Type Exports ============
export type CreateProviderInput = z.infer<typeof createProviderInputSchema>
export type DeleteProviderInput = z.infer<typeof deleteProviderInputSchema>
export type GetProviderByIdInput = z.infer<typeof getProviderByIdInputSchema>
export type ListObjectsInput = z.infer<typeof listObjectsInputSchema>
export type UploadFileInput = z.infer<typeof uploadFileInputSchema>
export type CreateFolderInput = z.infer<typeof createFolderInputSchema>
export type GetObjectUrlInput = z.infer<typeof getObjectUrlInputSchema>
export type DeleteObjectInput = z.infer<typeof deleteObjectInputSchema>
export type DeleteObjectsInput = z.infer<typeof deleteObjectsInputSchema>
export type RenameObjectInput = z.infer<typeof renameObjectInputSchema>
export type MoveObjectInput = z.infer<typeof moveObjectInputSchema>
export type MoveObjectsInput = z.infer<typeof moveObjectsInputSchema>
