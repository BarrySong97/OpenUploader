import sharp from 'sharp'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const defaultInput = resolve('build', 'icon.png')
const defaultOutput = resolve('build', 'icon.ico')

async function ensureDir(filePath: string) {
  await mkdir(dirname(filePath), { recursive: true })
}

async function convertPngToIco(inputPath: string, outputPath: string) {
  const image = sharp(inputPath).resize(256, 256, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  })
  const pngBuffer = await image.png().toBuffer()
  const { data: pngData, info } = await sharp(pngBuffer)
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true })
  if (info.width !== 256 || info.height !== 256 || info.channels !== 4) {
    throw new Error(`Unexpected decoded image shape: ${info.width}x${info.height}x${info.channels}`)
  }

  const headerSize = 6
  const entrySize = 16
  const imageOffset = headerSize + entrySize

  const header = Buffer.alloc(headerSize)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type (icon)
  header.writeUInt16LE(1, 4) // count

  const entry = Buffer.alloc(entrySize)
  entry.writeUInt8(0, 0) // width (0 = 256)
  entry.writeUInt8(0, 1) // height (0 = 256)
  entry.writeUInt8(0, 2) // color count
  entry.writeUInt8(0, 3) // reserved
  entry.writeUInt16LE(1, 4) // planes
  entry.writeUInt16LE(32, 6) // bit count
  entry.writeUInt32LE(pngBuffer.length, 8) // bytes in resource
  entry.writeUInt32LE(imageOffset, 12) // image offset

  const ico = Buffer.concat([header, entry, pngBuffer])

  await ensureDir(outputPath)
  await writeFile(outputPath, ico)

  return {
    outputPath,
    bytes: ico.length
  }
}

async function main() {
  const inputPath = process.argv[2] ? resolve(process.argv[2]) : defaultInput
  const outputPath = process.argv[3] ? resolve(process.argv[3]) : defaultOutput

  const inputStats = await readFile(inputPath)
  if (!inputStats || inputStats.length === 0) {
    throw new Error(`Input PNG is empty: ${inputPath}`)
  }

  const result = await convertPngToIco(inputPath, outputPath)
  console.log(`ICO created: ${result.outputPath} (${result.bytes} bytes)`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
