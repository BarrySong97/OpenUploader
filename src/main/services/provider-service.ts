import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  CopyObjectCommand
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createClient } from '@supabase/supabase-js'
import type { Provider, S3Provider, SupabaseProvider } from '../../shared/schema/provider'

// ============ Types ============

export interface ConnectionResult {
  connected: boolean
  error?: string
}

export interface BucketInfo {
  name: string
  creationDate?: string
}

export interface ProviderStats {
  buckets: BucketInfo[]
  bucketCount: number
}

export interface FileItem {
  id: string
  name: string
  type: 'file' | 'folder'
  size?: number
  modified?: string
  mimeType?: string
}

export interface ListObjectsInput {
  provider: Provider
  bucket: string
  prefix?: string
  cursor?: string
  maxKeys?: number
}

export interface ListObjectsResult {
  files: FileItem[]
  nextCursor?: string
  hasMore: boolean
}

// ============ S3 Endpoint Configuration ============

function getS3Endpoint(provider: S3Provider): string | undefined {
  if (provider.endpoint) {
    return provider.endpoint
  }

  switch (provider.variant) {
    case 'aws-s3':
      return provider.region ? `https://s3.${provider.region}.amazonaws.com` : undefined
    case 'aliyun-oss':
      return provider.region ? `https://${provider.region}.aliyuncs.com` : undefined
    case 'tencent-cos':
      return provider.region ? `https://cos.${provider.region}.myqcloud.com` : undefined
    case 'cloudflare-r2':
      return provider.accountId
        ? `https://${provider.accountId}.r2.cloudflarestorage.com`
        : undefined
    case 'backblaze-b2':
      return provider.region ? `https://s3.${provider.region}.backblazeb2.com` : undefined
    case 'minio':
      return undefined
    default:
      return undefined
  }
}

// ============ S3 Client Factory ============

function createS3Client(provider: S3Provider): S3Client {
  const endpoint = getS3Endpoint(provider)

  return new S3Client({
    region: provider.region || 'auto',
    endpoint,
    credentials: {
      accessKeyId: provider.accessKeyId,
      secretAccessKey: provider.secretAccessKey
    },
    forcePathStyle: provider.variant !== 'aws-s3'
  })
}

// ============ S3 Operations ============

async function testS3Connection(provider: S3Provider): Promise<ConnectionResult> {
  try {
    const client = createS3Client(provider)
    await client.send(new ListBucketsCommand({}))
    return { connected: true }
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function getS3ProviderStats(provider: S3Provider): Promise<ProviderStats> {
  const client = createS3Client(provider)
  const response = await client.send(new ListBucketsCommand({}))

  const buckets: BucketInfo[] =
    response.Buckets?.map((bucket) => ({
      name: bucket.Name || '',
      creationDate: bucket.CreationDate?.toISOString()
    })) || []

  return {
    buckets,
    bucketCount: buckets.length
  }
}

// ============ Supabase Operations ============

async function testSupabaseConnection(provider: SupabaseProvider): Promise<ConnectionResult> {
  try {
    const supabase = createClient(
      provider.projectUrl,
      provider.serviceRoleKey || provider.anonKey || ''
    )

    const { error } = await supabase.storage.listBuckets()

    if (error) {
      return { connected: false, error: error.message }
    }

    return { connected: true }
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function getSupabaseProviderStats(provider: SupabaseProvider): Promise<ProviderStats> {
  const supabase = createClient(
    provider.projectUrl,
    provider.serviceRoleKey || provider.anonKey || ''
  )

  const { data, error } = await supabase.storage.listBuckets()

  if (error) {
    throw new Error(error.message)
  }

  const buckets: BucketInfo[] =
    data?.map((bucket) => ({
      name: bucket.name,
      creationDate: bucket.created_at
    })) || []

  return {
    buckets,
    bucketCount: buckets.length
  }
}

// ============ Unified Interface ============

export async function testConnection(provider: Provider): Promise<ConnectionResult> {
  if (provider.type === 's3-compatible') {
    return testS3Connection(provider)
  } else {
    return testSupabaseConnection(provider)
  }
}

export async function getProviderStats(provider: Provider): Promise<ProviderStats> {
  if (provider.type === 's3-compatible') {
    return getS3ProviderStats(provider)
  } else {
    return getSupabaseProviderStats(provider)
  }
}

// ============ List Objects ============

function getMimeType(filename: string): string | undefined {
  const ext = filename.split('.').pop()?.toLowerCase()
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    pdf: 'application/pdf',
    zip: 'application/zip',
    json: 'application/json',
    txt: 'text/plain',
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript'
  }
  return ext ? mimeTypes[ext] : undefined
}

async function listS3Objects(
  provider: S3Provider,
  bucket: string,
  prefix?: string,
  cursor?: string,
  maxKeys: number = 100
): Promise<ListObjectsResult> {
  const client = createS3Client(provider)

  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix || '',
      Delimiter: '/',
      ContinuationToken: cursor,
      MaxKeys: maxKeys
    })
  )

  const files: FileItem[] = []

  // Add folders (CommonPrefixes)
  if (response.CommonPrefixes) {
    for (const prefix of response.CommonPrefixes) {
      if (prefix.Prefix) {
        const name = prefix.Prefix.replace(/\/$/, '').split('/').pop() || ''
        files.push({
          id: prefix.Prefix,
          name,
          type: 'folder'
        })
      }
    }
  }

  // Add files (Contents)
  if (response.Contents) {
    for (const obj of response.Contents) {
      // Skip the prefix itself (empty key after prefix)
      const key = obj.Key || ''
      const name = key.split('/').pop() || ''
      if (!name) continue

      files.push({
        id: key,
        name,
        type: 'file',
        size: obj.Size,
        modified: obj.LastModified?.toISOString(),
        mimeType: getMimeType(name)
      })
    }
  }

  return {
    files,
    nextCursor: response.NextContinuationToken,
    hasMore: response.IsTruncated || false
  }
}

async function listSupabaseObjects(
  provider: SupabaseProvider,
  bucket: string,
  prefix?: string,
  cursor?: string,
  maxKeys: number = 100
): Promise<ListObjectsResult> {
  const supabase = createClient(
    provider.projectUrl,
    provider.serviceRoleKey || provider.anonKey || ''
  )

  const offset = cursor ? parseInt(cursor, 10) : 0

  const { data, error } = await supabase.storage.from(bucket).list(prefix || '', {
    limit: maxKeys,
    offset
  })

  if (error) {
    throw new Error(error.message)
  }

  const files: FileItem[] =
    data?.map((item) => ({
      id: item.id || item.name,
      name: item.name,
      type: (item.metadata ? 'file' : 'folder') as 'file' | 'folder',
      size: item.metadata?.size,
      modified: item.updated_at,
      mimeType: item.metadata?.mimetype
    })) || []

  const hasMore = data?.length === maxKeys
  const nextCursor = hasMore ? String(offset + maxKeys) : undefined

  return {
    files,
    nextCursor,
    hasMore
  }
}

export async function listObjects(input: ListObjectsInput): Promise<ListObjectsResult> {
  const { provider, bucket, prefix, cursor, maxKeys } = input

  if (provider.type === 's3-compatible') {
    return listS3Objects(provider, bucket, prefix, cursor, maxKeys)
  } else {
    return listSupabaseObjects(provider, bucket, prefix, cursor, maxKeys)
  }
}

// ============ Upload File ============

export interface UploadFileInput {
  provider: Provider
  bucket: string
  key: string
  content: string // Base64 encoded
  contentType?: string
}

export interface UploadFileResult {
  success: boolean
  error?: string
}

async function uploadS3File(
  provider: S3Provider,
  bucket: string,
  key: string,
  content: string,
  contentType?: string
): Promise<UploadFileResult> {
  try {
    const client = createS3Client(provider)
    const buffer = Buffer.from(content, 'base64')

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType || getMimeType(key) || 'application/octet-stream'
      })
    )

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function uploadSupabaseFile(
  provider: SupabaseProvider,
  bucket: string,
  key: string,
  content: string,
  contentType?: string
): Promise<UploadFileResult> {
  try {
    const supabase = createClient(
      provider.projectUrl,
      provider.serviceRoleKey || provider.anonKey || ''
    )

    const buffer = Buffer.from(content, 'base64')
    const blob = new Blob([buffer], {
      type: contentType || getMimeType(key) || 'application/octet-stream'
    })

    const { error } = await supabase.storage.from(bucket).upload(key, blob, {
      contentType: contentType || getMimeType(key) || 'application/octet-stream',
      upsert: true
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function uploadFile(input: UploadFileInput): Promise<UploadFileResult> {
  const { provider, bucket, key, content, contentType } = input

  if (provider.type === 's3-compatible') {
    return uploadS3File(provider, bucket, key, content, contentType)
  } else {
    return uploadSupabaseFile(provider, bucket, key, content, contentType)
  }
}

// ============ Create Folder ============

export interface CreateFolderInput {
  provider: Provider
  bucket: string
  path: string // folder path (should end with /)
}

export interface CreateFolderResult {
  success: boolean
  error?: string
}

async function createS3Folder(
  provider: S3Provider,
  bucket: string,
  path: string
): Promise<CreateFolderResult> {
  try {
    const client = createS3Client(provider)
    // Ensure path ends with /
    const folderPath = path.endsWith('/') ? path : `${path}/`

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: folderPath,
        Body: '',
        ContentType: 'application/x-directory'
      })
    )

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function createSupabaseFolder(
  provider: SupabaseProvider,
  bucket: string,
  path: string
): Promise<CreateFolderResult> {
  try {
    const supabase = createClient(
      provider.projectUrl,
      provider.serviceRoleKey || provider.anonKey || ''
    )

    // Supabase doesn't have explicit folder creation
    // Create a .keep file to represent the folder
    const folderPath = path.endsWith('/') ? path : `${path}/`
    const keepFilePath = `${folderPath}.keep`

    const { error } = await supabase.storage.from(bucket).upload(keepFilePath, new Blob(['']), {
      contentType: 'text/plain'
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function createFolder(input: CreateFolderInput): Promise<CreateFolderResult> {
  const { provider, bucket, path } = input

  if (provider.type === 's3-compatible') {
    return createS3Folder(provider, bucket, path)
  } else {
    return createSupabaseFolder(provider, bucket, path)
  }
}

// ============ Get Object URL ============

export interface GetObjectUrlInput {
  provider: Provider
  bucket: string
  key: string
  expiresIn?: number // seconds, default 3600
}

export interface GetObjectUrlResult {
  url: string
  expiresAt: string
}

async function getS3ObjectUrl(
  provider: S3Provider,
  bucket: string,
  key: string,
  expiresIn: number = 3600
): Promise<GetObjectUrlResult> {
  const client = createS3Client(provider)

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key
  })

  const url = await getSignedUrl(client, command, { expiresIn })
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

  return { url, expiresAt }
}

async function getSupabaseObjectUrl(
  provider: SupabaseProvider,
  bucket: string,
  key: string,
  expiresIn: number = 3600
): Promise<GetObjectUrlResult> {
  const supabase = createClient(
    provider.projectUrl,
    provider.serviceRoleKey || provider.anonKey || ''
  )

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(key, expiresIn)

  if (error) {
    throw new Error(error.message)
  }

  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

  return { url: data.signedUrl, expiresAt }
}

export async function getObjectUrl(input: GetObjectUrlInput): Promise<GetObjectUrlResult> {
  const { provider, bucket, key, expiresIn } = input

  if (provider.type === 's3-compatible') {
    return getS3ObjectUrl(provider, bucket, key, expiresIn)
  } else {
    return getSupabaseObjectUrl(provider, bucket, key, expiresIn)
  }
}

// ============ Delete Object ============

export interface DeleteObjectInput {
  provider: Provider
  bucket: string
  key: string
  isFolder?: boolean
}

export interface DeleteResult {
  success: boolean
  error?: string
  deletedCount?: number
}

async function deleteS3Object(
  provider: S3Provider,
  bucket: string,
  key: string,
  isFolder?: boolean
): Promise<DeleteResult> {
  try {
    const client = createS3Client(provider)

    if (isFolder) {
      // For folders, we need to delete all objects with this prefix
      const keysToDelete: string[] = []
      let continuationToken: string | undefined

      // List all objects with this prefix
      do {
        const listResponse = await client.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: key,
            ContinuationToken: continuationToken
          })
        )

        if (listResponse.Contents) {
          for (const obj of listResponse.Contents) {
            if (obj.Key) {
              keysToDelete.push(obj.Key)
            }
          }
        }

        continuationToken = listResponse.NextContinuationToken
      } while (continuationToken)

      if (keysToDelete.length === 0) {
        return { success: true, deletedCount: 0 }
      }

      // Delete in batches of 1000 (S3 limit)
      let deletedCount = 0
      for (let i = 0; i < keysToDelete.length; i += 1000) {
        const batch = keysToDelete.slice(i, i + 1000)
        await client.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: {
              Objects: batch.map((k) => ({ Key: k }))
            }
          })
        )
        deletedCount += batch.length
      }

      return { success: true, deletedCount }
    } else {
      // Single file delete
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key
        })
      )
      return { success: true, deletedCount: 1 }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function deleteSupabaseObject(
  provider: SupabaseProvider,
  bucket: string,
  key: string,
  isFolder?: boolean
): Promise<DeleteResult> {
  try {
    const supabase = createClient(
      provider.projectUrl,
      provider.serviceRoleKey || provider.anonKey || ''
    )

    if (isFolder) {
      // List all files in the folder
      const { data: files, error: listError } = await supabase.storage.from(bucket).list(key)

      if (listError) {
        return { success: false, error: listError.message }
      }

      if (!files || files.length === 0) {
        return { success: true, deletedCount: 0 }
      }

      // Build full paths for deletion
      const paths = files.map((f) => `${key}${f.name}`)

      const { error } = await supabase.storage.from(bucket).remove(paths)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, deletedCount: paths.length }
    } else {
      const { error } = await supabase.storage.from(bucket).remove([key])

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, deletedCount: 1 }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function deleteObject(input: DeleteObjectInput): Promise<DeleteResult> {
  const { provider, bucket, key, isFolder } = input

  if (provider.type === 's3-compatible') {
    return deleteS3Object(provider, bucket, key, isFolder)
  } else {
    return deleteSupabaseObject(provider, bucket, key, isFolder)
  }
}

// ============ Delete Multiple Objects ============

export interface DeleteObjectsInput {
  provider: Provider
  bucket: string
  keys: string[]
}

async function deleteS3Objects(
  provider: S3Provider,
  bucket: string,
  keys: string[]
): Promise<DeleteResult> {
  try {
    const client = createS3Client(provider)

    // Delete in batches of 1000 (S3 limit)
    let deletedCount = 0
    for (let i = 0; i < keys.length; i += 1000) {
      const batch = keys.slice(i, i + 1000)
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: batch.map((k) => ({ Key: k }))
          }
        })
      )
      deletedCount += batch.length
    }

    return { success: true, deletedCount }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function deleteSupabaseObjects(
  provider: SupabaseProvider,
  bucket: string,
  keys: string[]
): Promise<DeleteResult> {
  try {
    const supabase = createClient(
      provider.projectUrl,
      provider.serviceRoleKey || provider.anonKey || ''
    )

    const { error } = await supabase.storage.from(bucket).remove(keys)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, deletedCount: keys.length }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function deleteObjects(input: DeleteObjectsInput): Promise<DeleteResult> {
  const { provider, bucket, keys } = input

  if (provider.type === 's3-compatible') {
    return deleteS3Objects(provider, bucket, keys)
  } else {
    return deleteSupabaseObjects(provider, bucket, keys)
  }
}

// ============ Rename Object ============

export interface RenameObjectInput {
  provider: Provider
  bucket: string
  sourceKey: string
  newName: string
}

export interface RenameResult {
  success: boolean
  error?: string
  newKey?: string
}

async function renameS3Object(
  provider: S3Provider,
  bucket: string,
  sourceKey: string,
  newName: string
): Promise<RenameResult> {
  try {
    const client = createS3Client(provider)

    // Calculate new key by replacing filename in path
    const pathParts = sourceKey.split('/')
    pathParts[pathParts.length - 1] = newName
    const destinationKey = pathParts.join('/')

    // Copy to new location
    await client.send(
      new CopyObjectCommand({
        Bucket: bucket,
        CopySource: encodeURIComponent(`${bucket}/${sourceKey}`),
        Key: destinationKey
      })
    )

    // Delete original
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: sourceKey
      })
    )

    return { success: true, newKey: destinationKey }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function renameSupabaseObject(
  provider: SupabaseProvider,
  bucket: string,
  sourceKey: string,
  newName: string
): Promise<RenameResult> {
  try {
    const supabase = createClient(
      provider.projectUrl,
      provider.serviceRoleKey || provider.anonKey || ''
    )

    // Calculate new key
    const pathParts = sourceKey.split('/')
    pathParts[pathParts.length - 1] = newName
    const destinationKey = pathParts.join('/')

    const { error } = await supabase.storage.from(bucket).move(sourceKey, destinationKey)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, newKey: destinationKey }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function renameObject(input: RenameObjectInput): Promise<RenameResult> {
  const { provider, bucket, sourceKey, newName } = input

  if (provider.type === 's3-compatible') {
    return renameS3Object(provider, bucket, sourceKey, newName)
  } else {
    return renameSupabaseObject(provider, bucket, sourceKey, newName)
  }
}

// ============ Move Object ============

export interface MoveObjectInput {
  provider: Provider
  bucket: string
  sourceKey: string
  destinationPrefix: string
}

export interface MoveResult {
  success: boolean
  error?: string
  newKey?: string
}

async function moveS3Object(
  provider: S3Provider,
  bucket: string,
  sourceKey: string,
  destinationPrefix: string
): Promise<MoveResult> {
  try {
    const client = createS3Client(provider)

    // Get filename from source key
    const fileName = sourceKey.split('/').pop() || ''
    const destinationKey = destinationPrefix ? `${destinationPrefix}${fileName}` : fileName

    // Copy to new location
    await client.send(
      new CopyObjectCommand({
        Bucket: bucket,
        CopySource: encodeURIComponent(`${bucket}/${sourceKey}`),
        Key: destinationKey
      })
    )

    // Delete original
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: sourceKey
      })
    )

    return { success: true, newKey: destinationKey }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function moveSupabaseObject(
  provider: SupabaseProvider,
  bucket: string,
  sourceKey: string,
  destinationPrefix: string
): Promise<MoveResult> {
  try {
    const supabase = createClient(
      provider.projectUrl,
      provider.serviceRoleKey || provider.anonKey || ''
    )

    // Get filename from source key
    const fileName = sourceKey.split('/').pop() || ''
    const destinationKey = destinationPrefix ? `${destinationPrefix}${fileName}` : fileName

    const { error } = await supabase.storage.from(bucket).move(sourceKey, destinationKey)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, newKey: destinationKey }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function moveObject(input: MoveObjectInput): Promise<MoveResult> {
  const { provider, bucket, sourceKey, destinationPrefix } = input

  if (provider.type === 's3-compatible') {
    return moveS3Object(provider, bucket, sourceKey, destinationPrefix)
  } else {
    return moveSupabaseObject(provider, bucket, sourceKey, destinationPrefix)
  }
}

// ============ Move Multiple Objects ============

export interface MoveObjectsInput {
  provider: Provider
  bucket: string
  sourceKeys: string[]
  destinationPrefix: string
}

export async function moveObjects(input: MoveObjectsInput): Promise<MoveResult> {
  const { provider, bucket, sourceKeys, destinationPrefix } = input

  try {
    for (const sourceKey of sourceKeys) {
      const result = await moveObject({ provider, bucket, sourceKey, destinationPrefix })
      if (!result.success) {
        return result
      }
    }
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
