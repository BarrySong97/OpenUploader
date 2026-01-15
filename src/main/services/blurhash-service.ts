import sharp from 'sharp'
import { decode, encode } from 'blurhash'

export interface BlurHashResult {
  content: string // base64 blurhash image
  width: number
  height: number
}

const BLURHASH_WIDTH = 32
const BLURHASH_COMPONENT_X = 4
const BLURHASH_COMPONENT_Y = 3
const BLURHASH_WEBP_QUALITY = 60

/**
 * Generate a small blurred preview image using BlurHash encode/decode.
 */
export async function generateBlurHash(content: string): Promise<BlurHashResult> {
  const buffer = Buffer.from(content, 'base64')

  const { data, info } = await sharp(buffer)
    .resize({ width: BLURHASH_WIDTH, withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const width = info.width ?? BLURHASH_WIDTH
  const height = info.height ?? BLURHASH_WIDTH
  const pixels = new Uint8ClampedArray(data)
  const hash = encode(pixels, width, height, BLURHASH_COMPONENT_X, BLURHASH_COMPONENT_Y)
  const decoded = decode(hash, width, height, 1)

  const resized = await sharp(Buffer.from(decoded), {
    raw: {
      width,
      height,
      channels: 4
    }
  })
    .webp({ quality: BLURHASH_WEBP_QUALITY })
    .toBuffer()

  return {
    content: resized.toString('base64'),
    width,
    height
  }
}
