import { z } from 'zod'
import { dialog, BrowserWindow } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import { basename, dirname, join, extname } from 'path'
import { publicProcedure, router } from '../trpc'
import { compressImage, getImageInfo, getOutputExtension } from '@main/services/image-service'
import { getAllPresets, getPresetById } from '@main/services/preset-service'

const compressImageInputSchema = z.object({
  content: z.string(), // Base64 encoded
  preset: z.string(), // Preset ID (can be built-in or custom)
  filename: z.string().optional()
})

const getImageInfoInputSchema = z.object({
  content: z.string() // Base64 encoded
})

const compressFileInputSchema = z.object({
  filePath: z.string(),
  presetId: z.string(),
  outputPath: z.string().optional()
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
  }),

  // Select image file using system dialog
  selectImageFile: publicProcedure.mutation(async () => {
    const window = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(window!, {
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true, filePath: null }
    }

    return { canceled: false, filePath: result.filePaths[0] }
  }),

  // Compress file - generic interface for compression
  compressFile: publicProcedure.input(compressFileInputSchema).mutation(async ({ input }) => {
    const { filePath, presetId, outputPath } = input

    try {
      // Read source file
      const fileBuffer = await readFile(filePath)
      const content = fileBuffer.toString('base64')
      const originalFilename = basename(filePath)

      // Compress image
      const result = await compressImage({
        content,
        preset: presetId,
        filename: originalFilename
      })

      if (!result.success || !result.content) {
        return {
          success: false,
          originalSize: result.originalSize,
          error: result.error || 'Compression failed'
        }
      }

      // Determine output path
      let finalOutputPath: string
      if (outputPath) {
        finalOutputPath = outputPath
      } else {
        // Get preset info for the filename
        const preset = await getPresetById(presetId)
        const presetName = preset?.name || presetId

        // Save to same directory with new extension based on format
        const dir = dirname(filePath)
        const newFilename = await getOutputExtension(presetId, originalFilename)
        // Add preset name suffix to avoid overwriting original
        const ext = extname(newFilename)
        const nameWithoutExt = newFilename.slice(0, -ext.length)
        finalOutputPath = join(dir, `${nameWithoutExt}_${presetName}${ext}`)
      }

      // Write compressed file
      const outputBuffer = Buffer.from(result.content, 'base64')
      await writeFile(finalOutputPath, outputBuffer)

      return {
        success: true,
        outputPath: finalOutputPath,
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        width: result.width,
        height: result.height,
        format: result.format
      }
    } catch (error) {
      return {
        success: false,
        originalSize: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })
})
