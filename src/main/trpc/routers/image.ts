import { z } from 'zod'
import { publicProcedure, router } from '../trpc'
import {
  compressImage,
  getImageInfo,
  COMPRESSION_PRESETS,
  type CompressionPreset
} from '@main/services/image-service'

const compressionPresetSchema = z.enum([
  'thumbnail',
  'preview',
  'standard',
  'hd',
  'original'
]) as z.ZodType<CompressionPreset>

const compressImageInputSchema = z.object({
  content: z.string(), // Base64 encoded
  preset: compressionPresetSchema,
  filename: z.string().optional()
})

const getImageInfoInputSchema = z.object({
  content: z.string() // Base64 encoded
})

export const imageRouter = router({
  compress: publicProcedure.input(compressImageInputSchema).mutation(async ({ input }) => {
    return compressImage(input)
  }),

  getInfo: publicProcedure.input(getImageInfoInputSchema).query(async ({ input }) => {
    return getImageInfo(input.content)
  }),

  getPresets: publicProcedure.query(() => {
    return COMPRESSION_PRESETS
  })
})
