import sharp from 'sharp'
import type { CompressionPreset, FitMode } from '@shared/schema/settings'

// ============ Types ============

export type { CompressionPreset } from '@shared/schema/settings'

export interface CompressionConfig {
  preset: CompressionPreset
  maxWidth: number
  maxHeight: number
  quality: number
  format: 'webp' | 'jpeg' | 'png' | 'original'
  fit: FitMode
}

export const COMPRESSION_PRESETS: Record<CompressionPreset, CompressionConfig> = {
  thumbnail: {
    preset: 'thumbnail',
    maxWidth: 200,
    maxHeight: 200,
    quality: 60,
    format: 'webp',
    fit: 'cover'
  },
  preview: {
    preset: 'preview',
    maxWidth: 800,
    maxHeight: 800,
    quality: 75,
    format: 'webp',
    fit: 'inside'
  },
  standard: {
    preset: 'standard',
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 85,
    format: 'webp',
    fit: 'inside'
  },
  hd: {
    preset: 'hd',
    maxWidth: 4096,
    maxHeight: 4096,
    quality: 90,
    format: 'webp',
    fit: 'inside'
  },
  original: {
    preset: 'original',
    maxWidth: Infinity,
    maxHeight: Infinity,
    quality: 100,
    format: 'original',
    fit: 'inside'
  }
}

export interface CompressImageInput {
  content: string // Base64 encoded
  preset: CompressionPreset
  filename?: string
  fit?: FitMode
}

export interface CompressImageResult {
  success: boolean
  content?: string // Base64 encoded
  originalSize: number
  compressedSize?: number
  width?: number
  height?: number
  format?: string
  error?: string
}

export interface ImageInfo {
  width: number
  height: number
  format: string
  size: number
}

// ============ Image Service ============

export async function getImageInfo(content: string): Promise<ImageInfo> {
  const buffer = Buffer.from(content, 'base64')
  const metadata = await sharp(buffer).metadata()

  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || 'unknown',
    size: buffer.length
  }
}

export async function compressImage(input: CompressImageInput): Promise<CompressImageResult> {
  const { content, preset } = input
  const config = COMPRESSION_PRESETS[preset]

  // If original preset, return as-is
  if (preset === 'original') {
    const buffer = Buffer.from(content, 'base64')
    return {
      success: true,
      content,
      originalSize: buffer.length,
      compressedSize: buffer.length,
      format: 'original'
    }
  }

  try {
    const inputBuffer = Buffer.from(content, 'base64')
    const originalSize = inputBuffer.length

    // Get original image metadata
    const metadata = await sharp(inputBuffer).metadata()
    const originalWidth = metadata.width || 0
    const originalHeight = metadata.height || 0

    // Calculate target dimensions while maintaining aspect ratio
    let targetWidth = originalWidth
    let targetHeight = originalHeight

    if (originalWidth > config.maxWidth || originalHeight > config.maxHeight) {
      const widthRatio = config.maxWidth / originalWidth
      const heightRatio = config.maxHeight / originalHeight
      const ratio = Math.min(widthRatio, heightRatio)

      targetWidth = Math.round(originalWidth * ratio)
      targetHeight = Math.round(originalHeight * ratio)
    }

    // Process image
    let pipeline = sharp(inputBuffer).resize(targetWidth, targetHeight, {
      fit: input.fit || 'inside',
      withoutEnlargement: true
    })

    // Convert to target format
    let outputBuffer: Buffer
    let outputFormat: string

    switch (config.format) {
      case 'webp':
        outputBuffer = await pipeline.webp({ quality: config.quality }).toBuffer()
        outputFormat = 'webp'
        break
      case 'jpeg':
        outputBuffer = await pipeline.jpeg({ quality: config.quality }).toBuffer()
        outputFormat = 'jpeg'
        break
      case 'png':
        outputBuffer = await pipeline
          .png({ compressionLevel: Math.round((100 - config.quality) / 10) })
          .toBuffer()
        outputFormat = 'png'
        break
      default:
        // Keep original format but apply quality
        if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
          outputBuffer = await pipeline.jpeg({ quality: config.quality }).toBuffer()
          outputFormat = 'jpeg'
        } else if (metadata.format === 'png') {
          outputBuffer = await pipeline
            .png({ compressionLevel: Math.round((100 - config.quality) / 10) })
            .toBuffer()
          outputFormat = 'png'
        } else if (metadata.format === 'webp') {
          outputBuffer = await pipeline.webp({ quality: config.quality }).toBuffer()
          outputFormat = 'webp'
        } else {
          // For other formats, convert to webp
          outputBuffer = await pipeline.webp({ quality: config.quality }).toBuffer()
          outputFormat = 'webp'
        }
    }

    // Get output metadata
    const outputMetadata = await sharp(outputBuffer).metadata()

    return {
      success: true,
      content: outputBuffer.toString('base64'),
      originalSize,
      compressedSize: outputBuffer.length,
      width: outputMetadata.width,
      height: outputMetadata.height,
      format: outputFormat
    }
  } catch (error) {
    return {
      success: false,
      originalSize: Buffer.from(content, 'base64').length,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export function isCompressibleImage(mimeType: string): boolean {
  const compressibleTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  return compressibleTypes.includes(mimeType.toLowerCase())
}

export function getOutputMimeType(preset: CompressionPreset, originalMimeType: string): string {
  const config = COMPRESSION_PRESETS[preset]

  if (config.format === 'original') {
    return originalMimeType
  }

  switch (config.format) {
    case 'webp':
      return 'image/webp'
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    default:
      return originalMimeType
  }
}

export function getOutputExtension(preset: CompressionPreset, originalFilename: string): string {
  const config = COMPRESSION_PRESETS[preset]

  if (config.format === 'original') {
    return originalFilename
  }

  // Get the base name without extension
  const lastDotIndex = originalFilename.lastIndexOf('.')
  const baseName = lastDotIndex > 0 ? originalFilename.substring(0, lastDotIndex) : originalFilename

  switch (config.format) {
    case 'webp':
      return `${baseName}.webp`
    case 'jpeg':
      return `${baseName}.jpg`
    case 'png':
      return `${baseName}.png`
    default:
      return originalFilename
  }
}
