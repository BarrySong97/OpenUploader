import { z } from 'zod'

// ============ Upload History Schemas ============

export const listUploadsInputSchema = z.object({
  providerId: z.string().optional(),
  bucket: z.string().optional(),
  query: z.string().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  fileTypes: z.array(z.string()).optional(),
  sortBy: z.enum(['uploadedAt', 'name', 'size']).default('uploadedAt'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(50)
})

export const getStatsInputSchema = z.object({
  providerId: z.string().optional(),
  bucket: z.string().optional()
})

export const deleteRecordInputSchema = z.object({
  id: z.string()
})

export const createRecordInputSchema = z.object({
  providerId: z.string(),
  bucket: z.string(),
  key: z.string(),
  name: z.string(),
  type: z.enum(['file', 'folder']),
  size: z.number().optional(),
  mimeType: z.string().optional(),
  uploadSource: z.string().optional(),
  isCompressed: z.boolean().optional(),
  originalSize: z.number().optional(),
  compressionPresetId: z.string().optional(),
  status: z.enum(['uploading', 'completed', 'error']).optional()
})

export const updateStatusInputSchema = z.object({
  id: z.string(),
  status: z.enum(['uploading', 'completed', 'error']),
  errorMessage: z.string().optional()
})

// ============ Type Exports ============

export type ListUploadsInput = z.infer<typeof listUploadsInputSchema>
export type GetStatsInput = z.infer<typeof getStatsInputSchema>
export type DeleteRecordInput = z.infer<typeof deleteRecordInputSchema>
export type CreateRecordInput = z.infer<typeof createRecordInputSchema>
export type UpdateStatusInput = z.infer<typeof updateStatusInputSchema>
