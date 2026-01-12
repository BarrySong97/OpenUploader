import { z } from 'zod'
import { imageCompressionSettingsSchema } from '../settings'

// Input schemas
export const updateImageCompressionInputSchema = imageCompressionSettingsSchema

// Type exports
export type UpdateImageCompressionInput = z.infer<typeof updateImageCompressionInputSchema>
