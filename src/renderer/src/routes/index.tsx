import { useEffect, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  IconCloud,
  IconFolder,
  IconWorld,
  IconChevronRight,
  IconUpload,
  IconCopy,
  IconCheck,
  IconDownload
} from '@tabler/icons-react'
import { format } from 'date-fns'
import { type ProviderType } from '@renderer/db'
import { EmptyState } from '@/components/provider/empty-state'
import { AddProviderDialog } from '@/components/provider/add-provider-dialog'
import { ProviderCard } from '@/components/provider/provider-card'
import { AddProviderCard } from '@/components/provider/add-provider-card'
import { FileDetailSheet } from '@/components/provider/file-detail-sheet'
import type { FileItem } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { trpc, type TRPCProvider } from '@renderer/lib/trpc'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/dashboard/status-card'
import { PageLayout } from '@/components/layout/page-layout'
import { formatFileSize } from '@/lib/utils'
import { getFileIcon } from '@/lib/file-utils'
import { toast } from '@/hooks/use-toast'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { useBucketStore } from '@renderer/stores/bucket-store'

export const Route = createFileRoute('/')({
  component: Index
})

// Maximum number of providers to show on dashboard
const MAX_DASHBOARD_PROVIDERS = 5

function Index() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<ProviderType | undefined>()
  // File detail drawer state
  const [fileDetailOpen, setFileDetailOpen] = useState(false)
  const [selectedFileDetail, setSelectedFileDetail] = useState<{
    file: FileItem
    provider: TRPCProvider
    bucket: string
  } | null>(null)

  const { data: providers, isLoading } = trpc.provider.list.useQuery()
  const { data: globalStats } = trpc.provider.getGlobalStats.useQuery()
  const trpcUtils = trpc.useUtils()

  // Download mutations
  const showSaveDialogMutation = trpc.provider.showSaveDialog.useMutation()
  const downloadToFileMutation = trpc.provider.downloadToFile.useMutation()

  // Fetch recent uploads
  const { data: recentUploads } = trpc.uploadHistory.list.useQuery({
    page: 1,
    pageSize: 20,
    sortBy: 'uploadedAt',
    sortDirection: 'desc'
  })

  const handleAddProvider = (type?: ProviderType) => {
    setSelectedType(type)
    setDialogOpen(true)
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setSelectedType(undefined)
    }
  }

  const handleRowClick = async (item: {
    id: string
    providerId: string
    bucket: string
    key: string
    name: string
    type: 'file' | 'folder'
    size?: number | null
    mimeType?: string | null
    uploadedAt: string
  }) => {
    try {
      const provider = await trpcUtils.provider.getById.fetch({ id: item.providerId })
      if (!provider) {
        toast({
          title: 'Error',
          description: 'Provider not found for this file.',
          variant: 'destructive'
        })
        return
      }

      const file: FileItem = {
        id: item.key,
        name: item.name,
        type: item.type,
        size: item.size ?? undefined,
        modified: new Date(item.uploadedAt),
        mimeType: item.mimeType ?? undefined
      }

      setSelectedFileDetail({ file, provider, bucket: item.bucket })
      setFileDetailOpen(true)
    } catch (error) {
      console.error('Failed to open file details:', error)
    }
  }

  const getCopyUrl = async (providerId: string, bucket: string, key: string): Promise<string> => {
    try {
      const provider = await trpcUtils.provider.getById.fetch({ id: providerId })
      if (!provider) {
        toast({
          title: 'Error',
          description: 'Provider not found.',
          variant: 'destructive'
        })
        return ''
      }

      const result = await trpcUtils.provider.getPlainObjectUrl.fetch({
        provider,
        bucket,
        key
      })

      return result.url || ''
    } catch (error) {
      console.error('Failed to get URL:', error)
      toast({
        title: 'Error',
        description: 'Failed to get URL.',
        variant: 'destructive'
      })
      return ''
    }
  }

  const handleDownload = async (
    e: React.MouseEvent,
    providerId: string,
    bucket: string,
    key: string,
    fileName: string
  ) => {
    e.stopPropagation()
    try {
      const provider = await trpcUtils.provider.getById.fetch({ id: providerId })
      if (!provider) {
        toast({
          title: 'Download failed',
          description: 'Provider not found',
          variant: 'destructive'
        })
        return
      }

      const dialogResult = await showSaveDialogMutation.mutateAsync({
        defaultName: fileName
      })

      if (dialogResult.canceled || !dialogResult.filePath) {
        return
      }

      const downloadResult = await downloadToFileMutation.mutateAsync({
        provider,
        bucket,
        key,
        savePath: dialogResult.filePath
      })

      if (downloadResult.success) {
        toast({
          title: 'Download complete',
          description: `File saved to ${downloadResult.filePath}`
        })
      } else {
        toast({
          title: 'Download failed',
          description: downloadResult.error || 'An unknown error occurred',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Download failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      })
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <PageLayout>
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-md" />
          <Skeleton className="h-24 rounded-md" />
          <Skeleton className="h-24 rounded-md" />
        </div>
        <div>
          <Skeleton className="mb-4 h-7 w-40" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Skeleton className="h-32 rounded-md" />
            <Skeleton className="h-32 rounded-md" />
          </div>
        </div>
      </PageLayout>
    )
  }

  // Empty state - show onboarding
  if (!providers || providers.length === 0) {
    return (
      <PageLayout>
        <EmptyState onAddProvider={handleAddProvider} />
        <AddProviderDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          defaultType={selectedType}
        />
      </PageLayout>
    )
  }

  // Limit providers shown on dashboard
  const displayedProviders = providers.slice(0, MAX_DASHBOARD_PROVIDERS)
  const hasMoreProviders = providers.length > MAX_DASHBOARD_PROVIDERS
  // Has providers - show list
  return (
    <PageLayout>
      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Providers"
          value={String(globalStats?.providersCount ?? 0)}
          icon={<IconCloud size={20} />}
        />
        <StatCard
          title="Buckets"
          value={String(globalStats?.bucketsCount ?? 0)}
          icon={<IconFolder size={20} />}
        />
        <StatCard
          title="Regions"
          value={String(globalStats?.regionsCount ?? 0)}
          icon={<IconWorld size={20} />}
        />
      </div>

      {/* Connected Providers */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Connected Providers</h2>
            <Badge variant="secondary" className="rounded-full">
              {providers.length}
            </Badge>
          </div>
          <Link to="/providers">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              View All
              <IconChevronRight size={16} />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayedProviders.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} />
          ))}
          {!hasMoreProviders && <AddProviderCard onClick={() => handleAddProvider()} />}
        </div>
        {hasMoreProviders && (
          <Link to="/providers" className="mt-4 block">
            <div className="flex items-center justify-center gap-2 rounded-md border border-dashed border-border py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
              View all {providers.length} providers
              <IconChevronRight size={16} />
            </div>
          </Link>
        )}
      </div>

      {/* Recently Uploaded */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Recently Uploaded</h2>
            <Badge variant="secondary" className="rounded-full">
              {recentUploads?.total ?? 0}
            </Badge>
          </div>
          <Link to="/my-uploads">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              View All
              <IconChevronRight size={16} />
            </Button>
          </Link>
        </div>

        {recentUploads && recentUploads.data.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Name
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Bucket
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Size
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Uploaded
                  </TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentUploads.data.map((item) => (
                  <RecentUploadRow
                    key={item.id}
                    item={{
                      ...item,
                      type: item.type === 'folder' ? 'folder' : 'file'
                    }}
                    onRowClick={handleRowClick}
                    onDownload={handleDownload}
                    onCopyUrl={getCopyUrl}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-md border py-16">
            <IconUpload size={48} className="mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">No uploads yet</p>
            <p className="text-sm text-muted-foreground">
              Files uploaded through this app will appear here
            </p>
          </div>
        )}
      </div>

      <AddProviderDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        defaultType={selectedType}
      />

      {/* File Detail Sheet */}
      <FileDetailSheet
        open={fileDetailOpen}
        onOpenChange={setFileDetailOpen}
        file={selectedFileDetail?.file ?? null}
        provider={selectedFileDetail?.provider ?? ({} as TRPCProvider)}
        bucket={selectedFileDetail?.bucket ?? ''}
      />
    </PageLayout>
  )
}

// Extract row component to use hooks
interface RecentUploadRowProps {
  item: {
    id: string
    providerId: string
    bucket: string
    key: string
    name: string
    type: 'file' | 'folder'
    size?: number | null
    mimeType?: string | null
    uploadedAt: string
    isCompressed?: boolean | null
  }
  onRowClick: (item: RecentUploadRowProps['item']) => void
  onDownload: (
    e: React.MouseEvent,
    providerId: string,
    bucket: string,
    key: string,
    fileName: string
  ) => void
  onCopyUrl: (providerId: string, bucket: string, key: string) => Promise<string>
}

function RecentUploadRow({ item, onRowClick, onDownload, onCopyUrl }: RecentUploadRowProps) {
  const { copied, copyToClipboard } = useCopyToClipboard()

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const url = await onCopyUrl(item.providerId, item.bucket, item.key)
    if (url) {
      await copyToClipboard(url)
    }
  }

  const fileIcon = getFileIcon(
    {
      name: item.name,
      type: item.type as 'file' | 'folder',
      id: item.id,
      modified: new Date(),
      size: item.size || 0
    },
    'small'
  )

  return (
    <TableRow className="group cursor-pointer" onClick={() => onRowClick(item)}>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">{fileIcon}</div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{item.name}</span>
            {item.isCompressed && (
              <Badge variant="secondary" className="text-xs">
                Compressed
              </Badge>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{item.bucket}</TableCell>
      <TableCell className="text-muted-foreground">
        {item.size ? formatFileSize(item.size) : '-'}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {format(new Date(item.uploadedAt), 'MMM dd, yyyy HH:mm')}
      </TableCell>
      <TableCell>
        {item.type === 'file' && (
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={(e) => onDownload(e, item.providerId, item.bucket, item.key, item.name)}
            >
              <IconDownload size={16} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={handleCopy}
            >
              {copied ? <IconCheck size={16} className="text-green-500" /> : <IconCopy size={16} />}
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  )
}
