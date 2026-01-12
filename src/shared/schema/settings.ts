import { z } from 'zod'

// Compression presets
export const compressionPresets = [
  'thumbnail',
  'preview',
  'standard',
  'hd',
  'original'
] as const

export type CompressionPreset = (typeof compressionPresets)[number]

// Fit modes for Sharp.js
export const fitModes = ['cover', 'contain', 'fill', 'inside', 'outside'] as const
export type FitMode = (typeof fitModes)[number]

// Image compression settings schema
export const imageCompressionSettingsSchema = z.object({
  quality: z.number().min(1).max(100),
  fit: z.enum(fitModes),
  preset: z.enum(compressionPresets)
})

export type ImageCompressionSettings = z.infer<typeof imageCompressionSettingsSchema>

// Full settings schema
export const settingsSchema = z.object({
  id: z.string(),
  imageCompression: imageCompressionSettingsSchema.nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
})

export type Settings = z.infer<typeof settingsSchema>
