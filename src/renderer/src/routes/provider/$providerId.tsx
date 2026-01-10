import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useLiveQuery, eq } from '@tanstack/react-db'
import { IconRefresh } from '@tabler/icons-react'
import { providersCollection, type Provider } from '@renderer/db'
import { useProviderStatus } from '@renderer/hooks/use-provider-status'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BucketTable,
  BucketTableSkeleton,
  type BucketInfo
} from '@renderer/components/provider/bucket-table'
import { BucketBrowser } from '@renderer/components/provider/bucket-browser'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/provider/$providerId')({
  component: ProviderDetail
})

function ProviderDetail() {
  const { providerId } = Route.useParams()
  const { data: providers } = useLiveQuery((q) =>
    q.from({ provider: providersCollection }).where(({ provider }) => eq(provider.id, providerId))
  )

  const provider = providers?.[0]

  if (!provider) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-muted-foreground">Provider not found</p>
          <Link to="/">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return <ProviderDetailContent provider={provider} />
}

function ProviderDetailContent({ provider }: { provider: Provider }) {
  const { isLoading, isConnected, error, stats, refresh } = useProviderStatus(provider)
  const [currentBucket, setCurrentBucket] = useState<string | null>(null)

  const getProviderTypeLabel = () => {
    if (provider.type === 's3-compatible') {
      const labels: Record<string, string> = {
        'aws-s3': 'AWS S3',
        'aliyun-oss': 'Aliyun OSS',
        'tencent-cos': 'Tencent COS',
        'cloudflare-r2': 'Cloudflare R2',
        minio: 'MinIO',
        'backblaze-b2': 'Backblaze B2'
      }
      return labels[provider.variant] || provider.variant
    }
    return 'Supabase Storage'
  }

  const handleBucketClick = (bucket: BucketInfo) => {
    setCurrentBucket(bucket.name)
  }

  const handleBackToBuckets = () => {
    setCurrentBucket(null)
  }

  // Show bucket browser when a bucket is selected
  if (currentBucket) {
    return <BucketBrowser provider={provider} bucket={currentBucket} onBack={handleBackToBuckets} />
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">{provider.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{getProviderTypeLabel()}</p>
            </div>
            <Badge
              variant={isConnected ? 'default' : 'secondary'}
              className={isConnected ? 'bg-green-500 text-white' : ''}
            >
              {isLoading ? 'Checking...' : isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
            <IconRefresh size={16} className={cn('mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <Skeleton className="h-7 w-32" />
            </div>
            <BucketTableSkeleton />
          </div>
        ) : error ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <p className="text-destructive">{error}</p>
              <Button variant="outline" className="mt-4" onClick={refresh}>
                Try Again
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Buckets ({stats?.bucketCount ?? 0})</h2>
            </div>
            <BucketTable
              buckets={stats?.buckets ?? []}
              onBucketClick={handleBucketClick}
            />
          </div>
        )}
      </div>
    </div>
  )
}
