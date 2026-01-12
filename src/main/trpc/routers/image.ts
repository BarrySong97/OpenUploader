import { z } from 'zod'
import { publicProcedure, router } from '../trpc'
import { compressImage, getImageInfo } from '@main/services/image-service'
import { getAllPresets } from '@main/services/preset-service'

const compressImageInputSchema = z.object({
  content: z.string(), // Base64 encoded
  preset: z.string(), // Preset ID (can be built-in or custom)
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

  getPresets: publicProcedure.query(async () => {
    return getAllPresets()
  })
})
