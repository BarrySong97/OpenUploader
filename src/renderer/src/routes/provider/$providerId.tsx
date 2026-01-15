import { useState, useEffect } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  IconRefresh,
  IconCloud,
  IconBrandAws,
  IconServer,
  IconSettings,
  IconCopy,
  IconCheck,
  IconFolderPlus,
  IconDatabase
} from '@tabler/icons-react'
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
import { trpc, type TRPCProvider } from '@renderer/lib/trpc'
import { CreateBucketDialog } from '@renderer/components/provider/create-bucket-dialog'
import { DeleteBucketDialog } from '@renderer/components/provider/delete-bucket-dialog'
import { ProviderSettingsDialog } from '@renderer/components/provider/provider-settings-dialog'
import { useNavigationStore } from '@renderer/stores/navigation-store'
import { PageLayout } from '@/components/layout/page-layout'

export const Route = createFileRoute('/provider/$providerId')({
  component: ProviderDetail
})

function ProviderDetail() {
  const { providerId } = Route.useParams()
  const { data: provider, isLoading } = trpc.provider.getById.useQuery({ id: providerId })

  if (isLoading) {
    return <ProviderDetailSkeleton />
  }

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

function ProviderDetailSkeleton() {
  return (
    <PageLayout className="space-y-8">
      {/* Provider Info Card Skeleton */}
      <div className="rounded-md border bg-card p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-5">
            <Skeleton className="h-20 w-20 rounded-2xl" />
            <div>
              <Skeleton className="h-8 w-48" />
              <div className="mt-3 flex gap-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
          </div>
          <Skeleton className="h-9 w-9" />
        </div>
        <div className="mt-6 border-t pt-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 h-10 w-full" />
        </div>
      </div>

      {/* Bucket List Skeleton */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <BucketTableSkeleton />
      </section>
    </PageLayout>
  )
}

// Helper functions for provider display
const variantStorageLabels: Record<string, string> = {
  'aws-s3': 'S3 Storage',
  'aliyun-oss': 'OSS Storage',
  'tencent-cos': 'COS Storage',
  'cloudflare-r2': 'R2 Storage',
  minio: 'MinIO Storage',
  'backblaze-b2': 'B2 Storage'
}

function getProviderIcon(provider: TRPCProvider, size: number = 40) {
  if (provider.type === 'supabase-storage') {
    return <IconCloud size={size} />
  }

  switch (provider.variant) {
    case 'aws-s3':
      return <IconBrandAws size={size} />
    case 'minio':
      return <IconServer size={size} />
    default:
      return <IconCloud size={size} />
  }
}

function getProviderStorageLabel(provider: TRPCProvider): string {
  if (provider.type === 'supabase-storage') {
    return 'Supabase Storage'
  }
  return variantStorageLabels[provider.variant] || 'S3 Storage'
}

function getProviderEndpoint(provider: TRPCProvider): string | null {
  if (provider.type === 'supabase-storage') {
    return provider.projectUrl
  }

  if (provider.endpoint) {
    return provider.endpoint
  }

  // Generate endpoint based on variant
  switch (provider.variant) {
    case 'aws-s3':
      return provider.region ? `https://s3.${provider.region}.amazonaws.com` : null
    case 'aliyun-oss':
      return provider.region ? `https://${provider.region}.aliyuncs.com` : null
    case 'tencent-cos':
      return provider.region ? `https://cos.${provider.region}.myqcloud.com` : null
    case 'cloudflare-r2':
      return provider.accountId ? `https://${provider.accountId}.r2.cloudflarestorage.com` : null
    case 'backblaze-b2':
      return provider.region ? `https://s3.${provider.region}.backblazeb2.com` : null
    default:
      return null
  }
}

function ProviderDetailContent({ provider }: { provider: TRPCProvider }) {
  const { isLoading, isConnected, error, stats, refresh } = useProviderStatus(provider)
  const [createBucketOpen, setCreateBucketOpen] = useState(false)
  const [deleteBucketOpen, setDeleteBucketOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [bucketToDelete, setBucketToDelete] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Navigation store
  const { currentBucket, setProvider, setBucket, reset } = useNavigationStore()

  // Set provider info when component mounts or provider changes
  useEffect(() => {
    const variant = provider.type === 's3-compatible' ? provider.variant : undefined
    setProvider({
      id: provider.id,
      name: provider.name,
      variant
    })

    // Reset navigation state when leaving the page
    return () => {
      reset()
    }
  }, [provider.id, provider.name, provider.type, setProvider, reset])

  const endpoint = getProviderEndpoint(provider)
  const region = provider.type === 's3-compatible' ? provider.region : null

  const handleBucketClick = (bucket: BucketInfo) => {
    setBucket(bucket.name)
  }

  const handleCopyEndpoint = async () => {
    if (endpoint) {
      await navigator.clipboard.writeText(endpoint)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleBucketDelete = (bucket: BucketInfo) => {
    setBucketToDelete(bucket.name)
    setDeleteBucketOpen(true)
  }

  // Show bucket browser when a bucket is selected
  if (currentBucket) {
    return <BucketBrowser provider={provider} bucket={currentBucket} />
  }

  return (
    <PageLayout className="space-y-8">
      {/* Provider Info Card */}
      <section className="rounded-md border bg-card shadow-sm">
        <div className="p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-5">
              {/* Provider Icon */}
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border bg-gradient-to-br from-gray-50 to-gray-100 shadow-inner dark:from-gray-800 dark:to-gray-900">
                <span className="text-gray-700 dark:text-gray-300">
                  {getProviderIcon(provider, 40)}
                </span>
              </div>

              {/* Provider Info */}
              <div>
                <h1 className="text-2xl font-bold">{provider.name}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {/* Storage Type Badge */}
                  <Badge variant="secondary" className="gap-1.5">
                    <IconDatabase size={14} />
                    {getProviderStorageLabel(provider)}
                  </Badge>

                  {/* Region Badge */}
                  {region && (
                    <Badge
                      variant="outline"
                      className="gap-1.5 border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/30 dark:bg-blue-900/20 dark:text-blue-300"
                    >
                      <IconCloud size={14} />
                      {region}
                    </Badge>
                  )}

                  {/* Connection Status Badge */}
                  <Badge
                    variant="outline"
                    className={cn(
                      'gap-1.5',
                      isLoading
                        ? 'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-900/30 dark:bg-yellow-900/20 dark:text-yellow-300'
                        : isConnected
                          ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/30 dark:bg-green-900/20 dark:text-green-300'
                          : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-300'
                    )}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        isLoading
                          ? 'animate-pulse bg-yellow-500'
                          : isConnected
                            ? 'animate-pulse bg-green-500'
                            : 'bg-red-500'
                      )}
                    />
                    {isLoading ? 'Checking...' : isConnected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Settings Button */}
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground"
              onClick={() => setSettingsOpen(true)}
            >
              <IconSettings size={20} />
            </Button>
          </div>

          {/* Endpoint URL Section */}
          {endpoint && (
            <div className="mt-6 border-t pt-6">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                S3 Endpoint URL
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 overflow-x-auto whitespace-nowrap rounded-lg border bg-muted/30 px-3 py-2 font-mono text-sm text-muted-foreground">
                  {endpoint}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn('shrink-0', 'text-muted-foreground')}
                  onClick={handleCopyEndpoint}
                  title={copied ? 'Copied!' : 'Copy URL'}
                >
                  {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Bucket List Section */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            Bucket List
            <span className="rounded-full border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {stats?.bucketCount ?? 0}
            </span>
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={isLoading}
              className="gap-2"
            >
              <IconRefresh size={16} className={cn(isLoading && 'animate-spin')} />
              Refresh
            </Button>
            <Button size="sm" className="gap-2" onClick={() => setCreateBucketOpen(true)}>
              <IconFolderPlus size={16} />
              Create Bucket
            </Button>
          </div>
        </div>

        {isLoading ? (
          <BucketTableSkeleton />
        ) : error ? (
          <div className="flex h-64 items-center justify-center rounded-md border">
            <div className="text-center">
              <p className="text-destructive">{error}</p>
              <Button variant="outline" className="mt-4" onClick={refresh}>
                Try Again
              </Button>
            </div>
          </div>
        ) : (
          <BucketTable
            buckets={stats?.buckets ?? []}
            onBucketClick={handleBucketClick}
            onBucketDelete={handleBucketDelete}
          />
        )}
      </section>

      {/* Create Bucket Dialog */}
      <CreateBucketDialog
        provider={provider}
        open={createBucketOpen}
        onOpenChange={setCreateBucketOpen}
        onSuccess={refresh}
      />

      {/* Delete Bucket Dialog */}
      <DeleteBucketDialog
        provider={provider}
        open={deleteBucketOpen}
        onOpenChange={setDeleteBucketOpen}
        bucketName={bucketToDelete}
        onSuccess={refresh}
      />

      {/* Provider Settings Dialog */}
      <ProviderSettingsDialog
        provider={provider}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </PageLayout>
  )
}
