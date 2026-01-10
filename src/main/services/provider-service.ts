import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3'
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
