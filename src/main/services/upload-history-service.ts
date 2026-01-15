import { uploadHistoryRepository, type ListUploadsParams } from '@main/db/upload-history-repository'

// Re-export types
export type {
  CreateUploadRecordInput,
  ListUploadsParams,
  PaginatedResult,
  UploadStats
} from '@main/db/upload-history-repository'
export type { UploadHistoryRecord } from '@main/db/schema'

/**
 * Service for managing upload history records
 */
export const uploadHistoryService = {
  /**
   * Create a new upload record (returns the created record with id)
   */
  async createRecord(params: {
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
  }) {
    try {
      const record = await uploadHistoryRepository.create(params)
      console.log('[uploadHistoryService] Upload record created:', {
        id: record.id,
        providerId: params.providerId,
        bucket: params.bucket,
        key: params.key,
        status: params.status || 'completed'
      })
      return record
    } catch (error) {
      console.error('[uploadHistoryService] Failed to create upload record:', error)
      throw error
    }
  },

  /**
   * Record a file upload (legacy method, creates with 'completed' status)
   */
  async recordUpload(params: {
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
  }) {
    try {
      await uploadHistoryRepository.create(params)
      console.log('[uploadHistoryService] Upload recorded:', {
        providerId: params.providerId,
        bucket: params.bucket,
        key: params.key
      })
    } catch (error) {
      // Log error but don't throw - recording upload history should not break the main flow
      console.error('[uploadHistoryService] Failed to record upload:', error)
    }
  },

  /**
   * Update upload status
   */
  async updateStatus(
    id: string,
    status: 'uploading' | 'completed' | 'error',
    errorMessage?: string
  ) {
    try {
      const updated = await uploadHistoryRepository.updateStatus(id, status, errorMessage)
      console.log('[uploadHistoryService] Upload status updated:', {
        id,
        status,
        errorMessage
      })
      return updated
    } catch (error) {
      console.error('[uploadHistoryService] Failed to update upload status:', error)
      throw error
    }
  },

  /**
   * List upload history with pagination and filtering
   */
  async listUploads(params: ListUploadsParams) {
    return uploadHistoryRepository.findAll(params)
  },

  /**
   * Get upload statistics
   */
  async getStats(params: { providerId?: string; bucket?: string }) {
    return uploadHistoryRepository.getStats(params)
  },

  /**
   * Delete a record by ID
   */
  async deleteRecord(id: string) {
    return uploadHistoryRepository.deleteById(id)
  },

  /**
   * Delete records when file is deleted from cloud
   */
  async deleteByKey(providerId: string, bucket: string, key: string) {
    try {
      const deletedCount = await uploadHistoryRepository.deleteByKey(providerId, bucket, key)
      console.log('[uploadHistoryService] Deleted upload records:', {
        providerId,
        bucket,
        key,
        deletedCount
      })
      return deletedCount
    } catch (error) {
      console.error('[uploadHistoryService] Failed to delete upload records:', error)
      return 0
    }
  },

  /**
   * Delete multiple records when files are deleted from cloud
   */
  async deleteByKeys(providerId: string, bucket: string, keys: string[]) {
    try {
      const deletedCount = await uploadHistoryRepository.deleteByKeys(providerId, bucket, keys)
      console.log('[uploadHistoryService] Deleted upload records:', {
        providerId,
        bucket,
        keysCount: keys.length,
        deletedCount
      })
      return deletedCount
    } catch (error) {
      console.error('[uploadHistoryService] Failed to delete upload records:', error)
      return 0
    }
  }
}
