import type { Provider } from '@shared/schema/provider'
import { createStorageAdapter } from '@main/adapters'
import { uploadHistoryService } from './upload-history-service'

// ============ Re-export Types from Adapter ============
export type {
  ConnectionResult,
  BucketInfo,
  FileItem,
  ListObjectsResult,
  UploadResult,
  DeleteResult,
  RenameResult,
  MoveResult,
  CreateFolderResult,
  ObjectUrlResult
} from '@main/adapters'

// ============ Input Types ============

export interface ProviderStats {
  buckets: { name: string; creationDate?: string }[]
  bucketCount: number
}

export interface ListObjectsInput {
  provider: Provider
  bucket: string
  prefix?: string
  cursor?: string
  maxKeys?: number
}

export interface UploadFileInput {
  provider: Provider
  bucket: string
  key: string
  content: string // Base64 encoded
  contentType?: string
}

export interface CreateFolderInput {
  provider: Provider
  bucket: string
  path: string
}

export interface GetObjectUrlInput {
  provider: Provider
  bucket: string
  key: string
  expiresIn?: number
}

export interface DeleteObjectInput {
  provider: Provider
  bucket: string
  key: string
  isFolder?: boolean
}

export interface DeleteObjectsInput {
  provider: Provider
  bucket: string
  keys: string[]
}

export interface RenameObjectInput {
  provider: Provider
  bucket: string
  sourceKey: string
  newName: string
}

export interface MoveObjectInput {
  provider: Provider
  bucket: string
  sourceKey: string
  destinationPrefix: string
}

export interface MoveObjectsInput {
  provider: Provider
  bucket: string
  sourceKeys: string[]
  destinationPrefix: string
}

export interface CreateBucketInput {
  provider: Provider
  bucketName: string
}

export interface DeleteBucketInput {
  provider: Provider
  bucketName: string
}

export interface CreateBucketResult {
  success: boolean
  error?: string
}

export interface DeleteBucketResult {
  success: boolean
  error?: string
}

// ============ Service Functions ============

export async function testConnection(provider: Provider) {
  const adapter = createStorageAdapter(provider)
  return adapter.testConnection()
}

export async function getProviderStats(provider: Provider): Promise<ProviderStats> {
  const adapter = createStorageAdapter(provider)
  const buckets = await adapter.listBuckets()

  return {
    buckets,
    bucketCount: buckets.length
  }
}

export async function listObjects(input: ListObjectsInput) {
  const adapter = createStorageAdapter(input.provider)
  return adapter.listObjects(input.bucket, {
    prefix: input.prefix,
    cursor: input.cursor,
    maxKeys: input.maxKeys
  })
}

export async function uploadFile(input: UploadFileInput) {
  const adapter = createStorageAdapter(input.provider)
  const buffer = Buffer.from(input.content, 'base64')

  console.log('[uploadFile] Uploading:', {
    bucket: input.bucket,
    key: input.key,
    contentType: input.contentType,
    bufferSize: buffer.length
  })

  const result = await adapter.uploadFile(input.bucket, input.key, buffer, {
    contentType: input.contentType
  })

  // Note: Upload history is now managed by the frontend via uploadHistory.createRecord and updateStatus
  // This allows tracking of upload failures and in-progress uploads

  return result
}

export async function createFolder(input: CreateFolderInput) {
  const adapter = createStorageAdapter(input.provider)
  const result = await adapter.createFolder(input.bucket, input.path)

  // Record folder creation if successful
  if (result.success) {
    const folderName = input.path.replace(/\/$/, '').split('/').pop() || input.path
    await uploadHistoryService.recordUpload({
      providerId: input.provider.id,
      bucket: input.bucket,
      key: input.path,
      name: folderName,
      type: 'folder',
      uploadSource: 'app'
    })
  }

  return result
}

export async function getObjectUrl(input: GetObjectUrlInput) {
  const adapter = createStorageAdapter(input.provider)
  return adapter.getObjectUrl(input.bucket, input.key, input.expiresIn)
}

export async function deleteObject(input: DeleteObjectInput) {
  const adapter = createStorageAdapter(input.provider)
  const result = await adapter.deleteObject(input.bucket, input.key, input.isFolder)

  // Delete upload history record if successful
  if (result.success) {
    await uploadHistoryService.deleteByKey(input.provider.id, input.bucket, input.key)
  }

  return result
}

export async function deleteObjects(input: DeleteObjectsInput) {
  const adapter = createStorageAdapter(input.provider)
  const result = await adapter.deleteObjects(input.bucket, input.keys)

  // Delete upload history records if successful
  if (result.success) {
    await uploadHistoryService.deleteByKeys(input.provider.id, input.bucket, input.keys)
  }

  return result
}

export async function renameObject(input: RenameObjectInput) {
  const adapter = createStorageAdapter(input.provider)
  return adapter.renameObject(input.bucket, input.sourceKey, input.newName)
}

export async function moveObject(input: MoveObjectInput) {
  const adapter = createStorageAdapter(input.provider)
  return adapter.moveObject(input.bucket, input.sourceKey, input.destinationPrefix)
}

export async function moveObjects(input: MoveObjectsInput) {
  const adapter = createStorageAdapter(input.provider)
  return adapter.moveObjects(input.bucket, input.sourceKeys, input.destinationPrefix)
}

export async function createBucket(input: CreateBucketInput): Promise<CreateBucketResult> {
  try {
    const adapter = createStorageAdapter(input.provider)
    await adapter.createBucket(input.bucketName)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function deleteBucket(input: DeleteBucketInput): Promise<DeleteBucketResult> {
  try {
    const adapter = createStorageAdapter(input.provider)
    await adapter.deleteBucket(input.bucketName)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
