import { eq } from 'drizzle-orm'
import { getDatabase } from '@main/db'
import { compressionPresets } from '@main/db/schema'
import type { CompressionPresetRecord, NewCompressionPresetRecord } from '@main/db/schema'
import type { CreatePresetInput, UpdatePresetInput, Preset } from '@shared/schema/settings'
import { COMPRESSION_PRESETS } from './image-service'
import type { CompressionPreset } from '@shared/schema/settings'

// ============ Built-in Presets ============

const BUILT_IN_PRESET_IDS: CompressionPreset[] = [
  'thumbnail',
  'preview',
  'standard',
  'hd',
  'original'
]

/**
 * Initialize built-in presets in the database
 * This should be called during app initialization
 */
export async function initializeBuiltInPresets(): Promise<void> {
  const db = getDatabase()

  for (const presetId of BUILT_IN_PRESET_IDS) {
    const config = COMPRESSION_PRESETS[presetId]

    // Check if preset already exists
    const existing = await db
      .select()
      .from(compressionPresets)
      .where(eq(compressionPresets.id, presetId))
      .limit(1)

    if (existing.length === 0) {
      // Insert built-in preset
      await db.insert(compressionPresets).values({
        id: presetId,
        name: presetId.charAt(0).toUpperCase() + presetId.slice(1),
        maxWidth: config.maxWidth === Infinity ? 999999 : config.maxWidth,
        maxHeight: config.maxHeight === Infinity ? 999999 : config.maxHeight,
        quality: config.quality,
        format: config.format,
        fit: config.fit,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }
  }
}

// ============ Helper Functions ============

function mapRecordToPreset(record: CompressionPresetRecord): Preset {
  return {
    id: record.id,
    name: record.name,
    maxWidth: record.maxWidth,
    maxHeight: record.maxHeight,
    quality: record.quality,
    format: record.format as Preset['format'],
    fit: record.fit as Preset['fit'],
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  }
}

// ============ CRUD Operations ============

/**
 * Get all presets
 */
export async function getAllPresets(): Promise<Preset[]> {
  const db = getDatabase()
  const records = await db.select().from(compressionPresets)
  return records.map(mapRecordToPreset)
}

/**
 * Get a single preset by ID
 */
export async function getPresetById(id: string): Promise<Preset | null> {
  const db = getDatabase()
  const records = await db
    .select()
    .from(compressionPresets)
    .where(eq(compressionPresets.id, id))
    .limit(1)

  if (records.length === 0) {
    return null
  }

  return mapRecordToPreset(records[0])
}

/**
 * Create a new preset
 */
export async function createPreset(input: CreatePresetInput): Promise<Preset> {
  const db = getDatabase()

  // Generate a unique ID for custom presets
  const id = `custom-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

  const newPreset: NewCompressionPresetRecord = {
    id,
    name: input.name,
    maxWidth: input.maxWidth,
    maxHeight: input.maxHeight,
    quality: input.quality,
    format: input.format,
    fit: input.fit,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const result = await db.insert(compressionPresets).values(newPreset).returning()

  return mapRecordToPreset(result[0])
}

/**
 * Update an existing preset
 */
export async function updatePreset(input: UpdatePresetInput): Promise<Preset> {
  const db = getDatabase()

  // Check if preset exists
  const existing = await getPresetById(input.id)

  if (!existing) {
    throw new Error(`Preset with id ${input.id} not found`)
  }

  // Build update object with only provided fields
  const updateData: Partial<NewCompressionPresetRecord> = {
    updatedAt: new Date()
  }

  if (input.name !== undefined) updateData.name = input.name
  if (input.maxWidth !== undefined) updateData.maxWidth = input.maxWidth
  if (input.maxHeight !== undefined) updateData.maxHeight = input.maxHeight
  if (input.quality !== undefined) updateData.quality = input.quality
  if (input.format !== undefined) updateData.format = input.format
  if (input.fit !== undefined) updateData.fit = input.fit

  const result = await db
    .update(compressionPresets)
    .set(updateData)
    .where(eq(compressionPresets.id, input.id))
    .returning()

  return mapRecordToPreset(result[0])
}

/**
 * Delete a preset
 */
export async function deletePreset(id: string): Promise<void> {
  const db = getDatabase()

  // Check if preset exists
  const existing = await getPresetById(id)

  if (!existing) {
    throw new Error(`Preset with id ${id} not found`)
  }

  await db.delete(compressionPresets).where(eq(compressionPresets.id, id))
}
