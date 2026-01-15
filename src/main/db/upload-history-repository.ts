import { eq, and, desc, asc, like, gte, lte, inArray, count, sum } from 'drizzle-orm'
import { getDatabase, schema } from './index'
import type { UploadHistoryRecord, NewUploadHistoryRecord } from './schema'

// ============ Types ============

export interface CreateUploadRecordInput {
  providerId: string
  bucket: string
  key: string
  name: string
  type: 'file' | 'folder'
  size?: number
  mimeType?: string
  uploadSource?: string
  isCompressed?: boolean
  originalSize?: number
  compressionPresetId?: string
  status?: 'uploading' | 'completed' | 'error'
  errorMessage?: string
}

export interface ListUploadsParams {
  providerId?: string
  bucket?: string
  query?: string
  dateFrom?: Date
  dateTo?: Date
  fileTypes?: string[]
  sortBy?: 'uploadedAt' | 'name' | 'size'
  sortDirection?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface UploadStats {
  totalFiles: number
  totalSize: number
  byFileType: Record<string, number>
  recentUploads: UploadHistoryRecord[]
}

// ============ Repository ============

export const uploadHistoryRepository = {
  /**
   * Create a new upload record
   */
  async create(input: CreateUploadRecordInput): Promise<UploadHistoryRecord> {
    const db = getDatabase()
    const id = `${input.providerId}:${input.bucket}:${input.key}:${Date.now()}`

    const record: NewUploadHistoryRecord = {
      id,
      providerId: input.providerId,
      bucket: input.bucket,
      key: input.key,
      name: input.name,
      type: input.type,
      size: input.size ?? null,
      mimeType: input.mimeType ?? null,
      uploadSource: input.uploadSource ?? 'app',
      isCompressed: input.isCompressed ?? false,
      originalSize: input.originalSize ?? null,
      compressionPresetId: input.compressionPresetId ?? null,
      status: input.status ?? 'completed',
      errorMessage: input.errorMessage ?? null
    }

    const [created] = await db.insert(schema.uploadHistory).values(record).returning()
    return created
  },

  /**
   * Find all upload records with pagination and filtering
   */
  async findAll(params: ListUploadsParams = {}): Promise<PaginatedResult<UploadHistoryRecord>> {
    const db = getDatabase()
    const {
      providerId,
      bucket,
      query,
      dateFrom,
      dateTo,
      fileTypes,
      sortBy = 'uploadedAt',
      sortDirection = 'desc',
      page = 1,
      pageSize = 50
    } = params

    // Build where conditions
    const conditions: any[] = []

    if (providerId) {
      conditions.push(eq(schema.uploadHistory.providerId, providerId))
    }
    if (bucket) {
      conditions.push(eq(schema.uploadHistory.bucket, bucket))
    }
    if (query) {
      conditions.push(like(schema.uploadHistory.name, `%${query}%`))
    }
    if (dateFrom) {
      conditions.push(gte(schema.uploadHistory.uploadedAt, dateFrom))
    }
    if (dateTo) {
      conditions.push(lte(schema.uploadHistory.uploadedAt, dateTo))
    }
    if (fileTypes && fileTypes.length > 0) {
      conditions.push(inArray(schema.uploadHistory.mimeType, fileTypes))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Get total count
    const countResult = whereClause
      ? await db.select({ value: count() }).from(schema.uploadHistory).where(whereClause)
      : await db.select({ value: count() }).from(schema.uploadHistory)

    const total = Number(countResult[0].value)

    // Get paginated data
    const sortColumn = schema.uploadHistory[sortBy]
    const sortFn = sortDirection === 'asc' ? asc : desc
    const offset = (page - 1) * pageSize

    const data = whereClause
      ? await db
          .select()
          .from(schema.uploadHistory)
          .where(whereClause)
          .orderBy(sortFn(sortColumn))
          .limit(pageSize)
          .offset(offset)
      : await db
          .select()
          .from(schema.uploadHistory)
          .orderBy(sortFn(sortColumn))
          .limit(pageSize)
          .offset(offset)

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    }
  },

  /**
   * Find upload records by provider
   */
  async findByProvider(providerId: string): Promise<UploadHistoryRecord[]> {
    const db = getDatabase()
    return db
      .select()
      .from(schema.uploadHistory)
      .where(eq(schema.uploadHistory.providerId, providerId))
      .orderBy(desc(schema.uploadHistory.uploadedAt))
  },

  /**
   * Find upload records by bucket
   */
  async findByBucket(providerId: string, bucket: string): Promise<UploadHistoryRecord[]> {
    const db = getDatabase()
    return db
      .select()
      .from(schema.uploadHistory)
      .where(
        and(
          eq(schema.uploadHistory.providerId, providerId),
          eq(schema.uploadHistory.bucket, bucket)
        )
      )
      .orderBy(desc(schema.uploadHistory.uploadedAt))
  },

  /**
   * Find upload record by key
   */
  async findByKey(
    providerId: string,
    bucket: string,
    key: string
  ): Promise<UploadHistoryRecord | null> {
    const db = getDatabase()
    const [record] = await db
      .select()
      .from(schema.uploadHistory)
      .where(
        and(
          eq(schema.uploadHistory.providerId, providerId),
          eq(schema.uploadHistory.bucket, bucket),
          eq(schema.uploadHistory.key, key)
        )
      )
      .orderBy(desc(schema.uploadHistory.uploadedAt))
      .limit(1)

    return record || null
  },

  /**
   * Delete a record by ID
   */
  async deleteById(id: string): Promise<boolean> {
    const db = getDatabase()
    const result = await db
      .delete(schema.uploadHistory)
      .where(eq(schema.uploadHistory.id, id))
      .returning()
    return result.length > 0
  },

  /**
   * Delete records by key (when file is deleted from cloud)
   */
  async deleteByKey(providerId: string, bucket: string, key: string): Promise<number> {
    const db = getDatabase()
    const result = await db
      .delete(schema.uploadHistory)
      .where(
        and(
          eq(schema.uploadHistory.providerId, providerId),
          eq(schema.uploadHistory.bucket, bucket),
          eq(schema.uploadHistory.key, key)
        )
      )
      .returning()
    return result.length
  },

  /**
   * Delete multiple records by keys
   */
  async deleteByKeys(providerId: string, bucket: string, keys: string[]): Promise<number> {
    const db = getDatabase()
    const result = await db
      .delete(schema.uploadHistory)
      .where(
        and(
          eq(schema.uploadHistory.providerId, providerId),
          eq(schema.uploadHistory.bucket, bucket),
          inArray(schema.uploadHistory.key, keys)
        )
      )
      .returning()
    return result.length
  },

  /**
   * Update upload status
   */
  async updateStatus(
    id: string,
    status: 'uploading' | 'completed' | 'error',
    errorMessage?: string
  ): Promise<UploadHistoryRecord | null> {
    const db = getDatabase()
    const [updated] = await db
      .update(schema.uploadHistory)
      .set({
        status,
        errorMessage: errorMessage ?? null,
        updatedAt: new Date()
      })
      .where(eq(schema.uploadHistory.id, id))
      .returning()
    return updated || null
  },

  /**
   * Get statistics
   */
  async getStats(params: { providerId?: string; bucket?: string } = {}): Promise<UploadStats> {
    const db = getDatabase()
    const { providerId, bucket } = params

    // Build where conditions
    const conditions: any[] = []
    if (providerId) {
      conditions.push(eq(schema.uploadHistory.providerId, providerId))
    }
    if (bucket) {
      conditions.push(eq(schema.uploadHistory.bucket, bucket))
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Get total count and size
    const statsResult = whereClause
      ? await db
          .select({
            totalFiles: count(),
            totalSize: sum(schema.uploadHistory.size)
          })
          .from(schema.uploadHistory)
          .where(whereClause)
      : await db
          .select({
            totalFiles: count(),
            totalSize: sum(schema.uploadHistory.size)
          })
          .from(schema.uploadHistory)

    const stats = statsResult[0]

    // Get file type distribution
    const typeDistribution = whereClause
      ? await db
          .select({
            mimeType: schema.uploadHistory.mimeType,
            count: count()
          })
          .from(schema.uploadHistory)
          .where(whereClause)
          .groupBy(schema.uploadHistory.mimeType)
      : await db
          .select({
            mimeType: schema.uploadHistory.mimeType,
            count: count()
          })
          .from(schema.uploadHistory)
          .groupBy(schema.uploadHistory.mimeType)

    const byFileType: Record<string, number> = {}
    for (const item of typeDistribution) {
      if (item.mimeType) {
        byFileType[item.mimeType] = Number(item.count)
      }
    }

    // Get recent uploads (last 10)
    const recentUploads = whereClause
      ? await db
          .select()
          .from(schema.uploadHistory)
          .where(whereClause)
          .orderBy(desc(schema.uploadHistory.uploadedAt))
          .limit(10)
      : await db
          .select()
          .from(schema.uploadHistory)
          .orderBy(desc(schema.uploadHistory.uploadedAt))
          .limit(10)

    return {
      totalFiles: Number(stats.totalFiles),
      totalSize: Number(stats.totalSize || 0),
      byFileType,
      recentUploads
    }
  }
}
