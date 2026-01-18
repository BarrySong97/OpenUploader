import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  CopyObjectCommand,
  CreateBucketCommand,
  DeleteBucketCommand,
  type BucketLocationConstraint
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { S3CompatibleProvider } from '@shared/schema/provider'
import type {
  StorageAdapter,
  ConnectionResult,
  BucketInfo,
  ListObjectsOptions,
  ListObjectsResult,
  FileMetadata,
  UploadResult,
  DeleteResult,
  RenameResult,
  MoveResult,
  CreateBucketOptions,
  CreateFolderResult,
  ObjectUrlResult
} from './storage-adapter.interface'

// ============ S3 Configuration ============

function getS3Endpoint(provider: S3CompatibleProvider): string | undefined {
  if (provider.endpoint) {
    return provider.endpoint
  }

  switch (provider.type) {
    case 'aws-s3':
      return provider.region ? `https://s3.${provider.region}.amazonaws.com` : undefined
    case 'cloudflare-r2':
      return provider.accountId
        ? `https://${provider.accountId}.r2.cloudflarestorage.com`
        : undefined
    case 'minio':
      return undefined
    default:
      return undefined
  }
}

// ============ Utility Functions ============

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

// ============ S3 Adapter Implementation ============

export class S3Adapter implements StorageAdapter {
  private client: S3Client
  private provider: S3CompatibleProvider

  constructor(provider: S3CompatibleProvider) {
    this.provider = provider
    const endpoint = getS3Endpoint(provider)

    this.client = new S3Client({
      region: provider.region || 'auto',
      endpoint,
      credentials: {
        accessKeyId: provider.accessKeyId,
        secretAccessKey: provider.secretAccessKey
      },
      forcePathStyle: provider.type !== 'aws-s3'
    })
  }

  // ============ Connection ============

  async testConnection(): Promise<ConnectionResult> {
    try {
      await this.client.send(new ListBucketsCommand({}))
      return { connected: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('[S3Adapter] Connection test failed:', {
        provider: {
          type: this.provider.type,
          region: this.provider.region,
          endpoint: getS3Endpoint(this.provider),
          accountId: 'accountId' in this.provider ? this.provider.accountId : undefined
        },
        error: message
      })
      return {
        connected: false,
        error: message
      }
    }
  }

  // ============ Bucket Operations ============

  async listBuckets(): Promise<BucketInfo[]> {
    const response = await this.client.send(new ListBucketsCommand({}))

    return (
      response.Buckets?.map((bucket) => ({
        name: bucket.Name || '',
        creationDate: bucket.CreationDate?.toISOString()
      })) || []
    )
  }

  async createBucket(name: string, options?: CreateBucketOptions): Promise<void> {
    await this.client.send(
      new CreateBucketCommand({
        Bucket: name,
        ...(this.provider.region &&
          this.provider.region !== 'us-east-1' && {
            CreateBucketConfiguration: {
              LocationConstraint: (options?.locationConstraint ||
                this.provider.region) as BucketLocationConstraint
            }
          })
      })
    )
  }

  async deleteBucket(name: string): Promise<void> {
    await this.client.send(
      new DeleteBucketCommand({
        Bucket: name
      })
    )
  }

  // ============ Object Operations ============

  async listObjects(bucket: string, options?: ListObjectsOptions): Promise<ListObjectsResult> {
    const response = await this.client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: options?.prefix || '',
        Delimiter: '/',
        ContinuationToken: options?.cursor,
        MaxKeys: options?.maxKeys || 100
      })
    )

    const files: ListObjectsResult['files'] = []

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

    // Sort files: folders first (alphabetically), then files by modified date (newest first)
    files.sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1
      if (a.type !== 'folder' && b.type === 'folder') return 1

      if (a.type === 'folder' && b.type === 'folder') {
        return a.name.localeCompare(b.name)
      }

      if (a.modified && b.modified) {
        return new Date(b.modified).getTime() - new Date(a.modified).getTime()
      }

      if (!a.modified) return 1
      if (!b.modified) return -1

      return 0
    })

    return {
      files,
      nextCursor: response.NextContinuationToken,
      hasMore: response.IsTruncated || false
    }
  }

  async uploadFile(
    bucket: string,
    key: string,
    content: Buffer,
    metadata?: FileMetadata
  ): Promise<UploadResult> {
    try {
      console.log('[S3Adapter] Uploading:', {
        bucket,
        key,
        contentType: metadata?.contentType,
        bufferSize: content.length,
        provider: {
          type: this.provider.type,
          region: this.provider.region,
          endpoint: getS3Endpoint(this.provider)
        }
      })

      await this.client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: content,
          ContentType: metadata?.contentType || getMimeType(key) || 'application/octet-stream'
        })
      )

      console.log('[S3Adapter] Upload successful:', { bucket, key })
      return { success: true }
    } catch (error) {
      console.error('[S3Adapter] Upload failed:', {
        bucket,
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorDetails: error
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async deleteObject(bucket: string, key: string, isFolder?: boolean): Promise<DeleteResult> {
    try {
      if (isFolder) {
        // For folders, delete all objects with this prefix
        const keysToDelete: string[] = []
        let continuationToken: string | undefined

        do {
          const listResponse = await this.client.send(
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
          await this.client.send(
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
        await this.client.send(
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

  async deleteObjects(bucket: string, keys: string[]): Promise<DeleteResult> {
    try {
      // Delete in batches of 1000 (S3 limit)
      let deletedCount = 0
      for (let i = 0; i < keys.length; i += 1000) {
        const batch = keys.slice(i, i + 1000)
        await this.client.send(
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

  // ============ Object Management ============

  async renameObject(bucket: string, sourceKey: string, newName: string): Promise<RenameResult> {
    try {
      // Calculate new key by replacing filename in path
      const pathParts = sourceKey.split('/')
      pathParts[pathParts.length - 1] = newName
      const destinationKey = pathParts.join('/')

      // Copy to new location
      await this.client.send(
        new CopyObjectCommand({
          Bucket: bucket,
          CopySource: encodeURIComponent(`${bucket}/${sourceKey}`),
          Key: destinationKey
        })
      )

      // Delete original
      await this.client.send(
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

  async moveObject(
    bucket: string,
    sourceKey: string,
    destinationPrefix: string
  ): Promise<MoveResult> {
    try {
      // Get filename from source key
      const fileName = sourceKey.split('/').pop() || ''
      const destinationKey = destinationPrefix ? `${destinationPrefix}${fileName}` : fileName

      // Copy to new location
      await this.client.send(
        new CopyObjectCommand({
          Bucket: bucket,
          CopySource: encodeURIComponent(`${bucket}/${sourceKey}`),
          Key: destinationKey
        })
      )

      // Delete original
      await this.client.send(
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

  async moveObjects(
    bucket: string,
    sourceKeys: string[],
    destinationPrefix: string
  ): Promise<MoveResult> {
    try {
      for (const sourceKey of sourceKeys) {
        const result = await this.moveObject(bucket, sourceKey, destinationPrefix)
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

  // ============ Folder Operations ============

  async createFolder(bucket: string, path: string): Promise<CreateFolderResult> {
    try {
      // Ensure path ends with /
      const folderPath = path.endsWith('/') ? path : `${path}/`

      await this.client.send(
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

  // ============ URL Generation ============

  async getObjectUrl(
    bucket: string,
    key: string,
    expiresIn: number = 3600
  ): Promise<ObjectUrlResult> {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    })

    const url = await getSignedUrl(this.client, command, { expiresIn })
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    return { url, expiresAt }
  }
}
