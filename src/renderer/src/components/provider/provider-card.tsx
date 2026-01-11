import { Link } from '@tanstack/react-router'
import {
  IconArrowRight,
  IconBucket,
  IconRefresh,
  IconCloud,
  IconBrandAws,
  IconServer
} from '@tabler/icons-react'
import type { TRPCProvider } from '@renderer/lib/trpc'
import { useProviderStatus } from '@renderer/hooks/use-provider-status'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ProviderCardProps {
  provider: TRPCProvider
}

const variantLabels: Record<string, string> = {
  'aws-s3': 'AWS S3',
  'aliyun-oss': 'Aliyun OSS',
  'tencent-cos': 'Tencent COS',
  'cloudflare-r2': 'Cloudflare R2',
  minio: 'MinIO',
  'backblaze-b2': 'Backblaze B2'
}

function getProviderIcon(provider: TRPCProvider) {
  if (provider.type === 'supabase-storage') {
    return <IconCloud size={24} />
  }

  switch (provider.variant) {
    case 'aws-s3':
      return <IconBrandAws size={24} />
    case 'minio':
      return <IconServer size={24} />
    default:
      return <IconCloud size={24} />
  }
}

function getProviderTypeLabel(provider: TRPCProvider): string {
  if (provider.type === 'supabase-storage') {
    return 'Supabase Storage'
  }
  return variantLabels[provider.variant] || provider.variant
}

export function ProviderCard({ provider }: ProviderCardProps) {
  const { isLoading, isConnected, error, stats, refresh } = useProviderStatus(provider)

  const region =
    provider.type === 's3-compatible' ? provider.region : new URL(provider.projectUrl).hostname

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
              {getProviderIcon(provider)}
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                {provider.name}
                <span
                  className={cn(
                    'inline-block h-2 w-2 rounded-full',
                    isLoading ? 'bg-yellow-500 animate-pulse' : isConnected ? 'bg-green-500' : 'bg-red-500'
                  )}
                />
              </CardTitle>
              <CardDescription className="mt-1">
                {getProviderTypeLabel(provider)}
                {region && ` · ${region}`}
              </CardDescription>
            </div>
          </div>
          <Badge
            variant={isConnected ? 'default' : 'secondary'}
            className={isConnected ? 'bg-green-500 text-white' : ''}
          >
            {isLoading ? 'Checking...' : isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex gap-6">
            {isLoading ? (
              <span className="text-sm text-muted-foreground">Loading...</span>
            ) : error ? (
              <span className="text-sm text-destructive">{error}</span>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <IconBucket size={16} />
                <span>{stats?.bucketCount ?? 0} buckets</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={refresh} disabled={isLoading}>
              <IconRefresh size={16} className={cn(isLoading && 'animate-spin')} />
            </Button>
            <Link to="/provider/$providerId" params={{ providerId: provider.id }}>
              <Button variant="ghost" size="default">
                Open
                <IconArrowRight size={16} className="ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
