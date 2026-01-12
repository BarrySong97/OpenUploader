import { eq } from 'drizzle-orm'
import { getDatabase, schema } from './index'
import type {
  Provider,
  S3Provider,
  SupabaseProvider,
  AddProviderForm
} from '@shared/schema/provider'
import type { ProviderRecord, NewProviderRecord } from './schema'

// Helper function to map DB record to Provider type
function mapRecordToProvider(record: ProviderRecord): Provider {
  if (record.type === 's3-compatible') {
    return {
      id: record.id,
      name: record.name,
      type: 's3-compatible',
      variant: record.variant!,
      accessKeyId: record.accessKeyId!,
      secretAccessKey: record.secretAccessKey!,
      region: record.region ?? undefined,
      endpoint: record.endpoint ?? undefined,
      bucket: record.bucket ?? undefined,
      accountId: record.accountId ?? undefined,
      createdAt: record.createdAt!,
      updatedAt: record.updatedAt!,
      lastOperationAt: record.lastOperationAt ?? null
    } as S3Provider
  } else {
    return {
      id: record.id,
      name: record.name,
      type: 'supabase-storage',
      projectUrl: record.projectUrl!,
      anonKey: record.anonKey ?? undefined,
      serviceRoleKey: record.serviceRoleKey ?? undefined,
      bucket: record.bucket ?? undefined,
      createdAt: record.createdAt!,
      updatedAt: record.updatedAt!,
      lastOperationAt: record.lastOperationAt ?? null
    } as SupabaseProvider
  }
}

// Helper function to map Provider to DB record (without timestamps - let DB handle them)
function mapProviderToRecord(
  provider: Omit<Provider, 'createdAt' | 'updatedAt'>
): Omit<NewProviderRecord, 'createdAt' | 'updatedAt'> {
  if (provider.type === 's3-compatible') {
    const s3Provider = provider as Omit<S3Provider, 'createdAt' | 'updatedAt'>
    return {
      id: s3Provider.id,
      name: s3Provider.name,
      type: 's3-compatible',
      variant: s3Provider.variant,
      accessKeyId: s3Provider.accessKeyId,
      secretAccessKey: s3Provider.secretAccessKey,
      region: s3Provider.region ?? null,
      endpoint: s3Provider.endpoint ?? null,
      bucket: s3Provider.bucket ?? null,
      accountId: s3Provider.accountId ?? null,
      projectUrl: null,
      anonKey: null,
      serviceRoleKey: null
    }
  } else {
    const supabaseProvider = provider as Omit<SupabaseProvider, 'createdAt' | 'updatedAt'>
    return {
      id: supabaseProvider.id,
      name: supabaseProvider.name,
      type: 'supabase-storage',
      variant: null,
      accessKeyId: null,
      secretAccessKey: null,
      region: null,
      endpoint: null,
      bucket: supabaseProvider.bucket ?? null,
      accountId: null,
      projectUrl: supabaseProvider.projectUrl,
      anonKey: supabaseProvider.anonKey ?? null,
      serviceRoleKey: supabaseProvider.serviceRoleKey ?? null
    }
  }
}

export const providerRepository = {
  async findAll(): Promise<Provider[]> {
    const db = getDatabase()
    const records = await db.select().from(schema.providers)
    return records.map(mapRecordToProvider)
  },

  async findById(id: string): Promise<Provider | null> {
    const db = getDatabase()
    const [record] = await db.select().from(schema.providers).where(eq(schema.providers.id, id))
    return record ? mapRecordToProvider(record) : null
  },

  async create(input: AddProviderForm & { id: string }): Promise<Provider> {
    const db = getDatabase()
    const record = mapProviderToRecord(input)
    try {
      const [created] = await db.insert(schema.providers).values(record).returning()
      return mapRecordToProvider(created)
    } catch (error) {
      console.error('Failed to create provider:', error)
      throw error
    }
  },

  async update(id: string, data: Partial<Provider>): Promise<Provider | null> {
    const db = getDatabase()
    const updateData: Partial<NewProviderRecord> = {
      updatedAt: new Date()
    }

    // Map partial provider data to record fields
    if (data.name !== undefined) updateData.name = data.name
    if (data.bucket !== undefined) updateData.bucket = data.bucket ?? null

    if (data.type === 's3-compatible') {
      const s3Data = data as Partial<S3Provider>
      if (s3Data.variant !== undefined) updateData.variant = s3Data.variant
      if (s3Data.accessKeyId !== undefined) updateData.accessKeyId = s3Data.accessKeyId
      if (s3Data.secretAccessKey !== undefined) updateData.secretAccessKey = s3Data.secretAccessKey
      if (s3Data.region !== undefined) updateData.region = s3Data.region ?? null
      if (s3Data.endpoint !== undefined) updateData.endpoint = s3Data.endpoint ?? null
      if (s3Data.accountId !== undefined) updateData.accountId = s3Data.accountId ?? null
    } else if (data.type === 'supabase-storage') {
      const supabaseData = data as Partial<SupabaseProvider>
      if (supabaseData.projectUrl !== undefined) updateData.projectUrl = supabaseData.projectUrl
      if (supabaseData.anonKey !== undefined) updateData.anonKey = supabaseData.anonKey ?? null
      if (supabaseData.serviceRoleKey !== undefined)
        updateData.serviceRoleKey = supabaseData.serviceRoleKey ?? null
    }

    const [updated] = await db
      .update(schema.providers)
      .set(updateData)
      .where(eq(schema.providers.id, id))
      .returning()

    return updated ? mapRecordToProvider(updated) : null
  },

  async delete(id: string): Promise<boolean> {
    const db = getDatabase()
    const result = await db.delete(schema.providers).where(eq(schema.providers.id, id)).returning()
    return result.length > 0
  },

  async updateLastOperationAt(id: string): Promise<void> {
    const db = getDatabase()
    await db
      .update(schema.providers)
      .set({ lastOperationAt: new Date() })
      .where(eq(schema.providers.id, id))
  }
}
