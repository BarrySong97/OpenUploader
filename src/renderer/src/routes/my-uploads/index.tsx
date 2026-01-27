import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  IconUpload,
  IconRefresh,
  IconSearch,
  IconDownload,
  IconTrash,
  IconFile,
  IconDatabase,
  IconClock
} from '@tabler/icons-react'
import { trpc, type TRPCProvider } from '@renderer/lib/trpc'
import { useDebouncedValue } from '@/hooks/use-debounce'
import { FileDetailSheet } from '@/components/provider/file-detail-sheet'
import type { FileItem } from '@/lib/types'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { format } from 'date-fns'
import { cn, formatFileSize } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { StatCard } from '@/components/dashboard/status-card'
import { MyUploadsPageSkeleton } from '@/components/ui/page-skeletons'
import { UploadHistoryTable } from '@/components/upload-history/upload-history-table'

export const Route = createFileRoute('/my-uploads/')({
  component: MyUploadsPage
})

function MyUploadsPage() {
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebouncedValue(searchInput, 300)
  const [page, setPage] = useState(1)
  // File detail drawer state
  const [fileDetailOpen, setFileDetailOpen] = useState(false)
  const [selectedFileDetail, setSelectedFileDetail] = useState<{
    file: FileItem
    provider: TRPCProvider
    bucket: string
  } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    providerId: string
    bucket: string
    key: string
    type: 'file' | 'folder'
    name: string
  } | null>(null)
  const [selectedItems, setSelectedItems] = useState<
    Record<
      string,
      {
        providerId: string
        bucket: string
        key: string
        type: 'file' | 'folder'
        name: string
      }
    >
  >({})
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false)
  const [batchMenuOpen, setBatchMenuOpen] = useState(false)
  const [isBatchDownloading, setIsBatchDownloading] = useState(false)
  const pageSize = 20

  // Fetch upload history
  const { data, isLoading, isFetching, refetch } = trpc.uploadHistory.list.useQuery({
    query: debouncedSearch || undefined,
    page,

    pageSize,
    sortBy: 'uploadedAt',
    sortDirection: 'desc'

  })

  // Fetch statistics
  const { data: stats } = trpc.uploadHistory.getStats.useQuery({})

  // Delete mutation
  const deleteObjectMutation = trpc.provider.deleteObject.useMutation({
    onSuccess: () => {
      refetch()
    }
  })
  const deleteObjectsMutation = trpc.provider.deleteObjects.useMutation()

  // Download mutations
  const showSaveDialogMutation = trpc.provider.showSaveDialog.useMutation()
  const showOpenDirectoryMutation = trpc.provider.showOpenDirectory.useMutation()
  const downloadToFileMutation = trpc.provider.downloadToFile.useMutation()

  const trpcUtils = trpc.useUtils()

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return

    try {
      const provider = await trpcUtils.provider.getById.fetch({ id: deleteTarget.providerId })
      if (!provider) {
        toast({
          title: 'Delete failed',
          description: 'Provider not found for this upload record.',
          variant: 'destructive'
        })
        return
      }

      const result = await deleteObjectMutation.mutateAsync({
        provider,
        bucket: deleteTarget.bucket,
        key: deleteTarget.key,
        isFolder: deleteTarget.type === 'folder'
      })

      if (result.success) {
        setDeleteTarget(null)
        return
      }

      toast({
        title: 'Delete failed',
        description: result.error || 'Unable to delete the file.',
        variant: 'destructive'
      })
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Unable to delete the file.',
        variant: 'destructive'
      })
    }
  }

  const selectedIds = Object.keys(selectedItems)
  const selectedCount = selectedIds.length

  useEffect(() => {
    if (selectedCount > 0) {
      setBatchMenuOpen(true)
    } else {
      setBatchMenuOpen(false)
    }
  }, [selectedCount])

  const handleToggleSelection = (
    item: {
      id: string
      providerId: string
      bucket: string
      key: string
      type: 'file' | 'folder'
      name: string
    },
    checked: boolean
  ) => {
    setSelectedItems((prev) => {
      if (!checked) {
        const { [item.id]: _, ...rest } = prev
        return rest
      }
      return {
        ...prev,
        [item.id]: {
          providerId: item.providerId,
          bucket: item.bucket,
          key: item.key,
          type: item.type,
          name: item.name
        }
      }
    })
  }

  const handleToggleAll = (checked: boolean) => {
    if (!data?.data) return
    setSelectedItems((prev) => {
      if (!checked) {
        const next = { ...prev }
        for (const item of data.data) {
          delete next[item.id]
        }
        return next
      }
      const next = { ...prev }
      for (const item of data.data) {
        next[item.id] = {
          providerId: item.providerId,
          bucket: item.bucket,
          key: item.key,
          type: item.type as 'file' | 'folder',
          name: item.name
        }
      }
      return next
    })
  }

  const handleCancelSelection = () => {
    setSelectedItems({})
  }

  const handleBatchDelete = async () => {
    if (selectedCount === 0) return

    const groups = new Map<string, { providerId: string; bucket: string; keys: string[] }>()
    for (const item of Object.values(selectedItems)) {
      const groupKey = `${item.providerId}::${item.bucket}`
      const group = groups.get(groupKey)
      if (group) {
        group.keys.push(item.key)
      } else {
        groups.set(groupKey, {
          providerId: item.providerId,
          bucket: item.bucket,
          keys: [item.key]
        })
      }
    }

    try {
      const providerCache = new Map<
        string,
        Awaited<ReturnType<typeof trpcUtils.provider.getById.fetch>> | null
      >()

      for (const group of groups.values()) {
        if (!providerCache.has(group.providerId)) {
          const provider = await trpcUtils.provider.getById.fetch({ id: group.providerId })
          providerCache.set(group.providerId, provider ?? null)
        }
        const provider = providerCache.get(group.providerId)
        if (!provider) {
          toast({
            title: 'Delete failed',
            description: 'Provider not found for selected items.',
            variant: 'destructive'
          })
          continue
        }

        const result = await deleteObjectsMutation.mutateAsync({
          provider,
          bucket: group.bucket,
          keys: group.keys
        })

        if (!result.success) {
          toast({
            title: 'Delete failed',
            description: result.error || 'Unable to delete selected files.',
            variant: 'destructive'
          })
        }
      }

      setSelectedItems({})
      setBatchDeleteDialogOpen(false)
      refetch()
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Unable to delete selected files.',
        variant: 'destructive'
      })
    }
  }

  const buildSavePath = (directory: string, fileName: string) => {
    const separator = window.api.platform.isWindows ? '\\' : '/'
    const trimmed = directory.replace(/[\\/]+$/, '')
    return `${trimmed}${separator}${fileName}`
  }

  const handleDownload = async (
    providerId: string,
    bucket: string,
    key: string,
    fileName: string
  ) => {
    try {
      // Get provider first
      const provider = await trpcUtils.provider.getById.fetch({ id: providerId })
      if (!provider) {
        toast({
          title: 'Download failed',
          description: 'Provider not found',
          variant: 'destructive'
        })
        return
      }

      // Show save dialog
      const dialogResult = await showSaveDialogMutation.mutateAsync({
        defaultName: fileName
      })

      if (dialogResult.canceled || !dialogResult.filePath) {
        return // User cancelled
      }

      // Download to file
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

  const getCopyUrl = async (providerId: string, bucket: string, key: string): Promise<string> => {
    try {
      const provider = await trpcUtils.provider.getById.fetch({ id: providerId })
      if (!provider) {
        toast({
          title: 'Error',
          description: 'Provider not found',
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
      toast({
        title: 'Error',
        description: 'Failed to get URL.',
        variant: 'destructive'
      })
      return ''
    }
  }

  const handleBatchDownload = async () => {
    if (selectedCount === 0 || isBatchDownloading) return
    console.log('selectedCount', selectedCount)
    console.log('isBatchDownloading', isBatchDownloading)

    const downloadItems = Object.values(selectedItems).filter((item) => item.type === 'file')
    if (downloadItems.length === 0) {
      toast({
        title: 'Download unavailable',
        description: 'Only files can be downloaded.'
      })
      return
    }

    try {
      setIsBatchDownloading(true)
      const dialogResult = await showOpenDirectoryMutation.mutateAsync({
        title: 'Select download folder'
      })
      if (dialogResult.canceled || !dialogResult.folderPath) {
        if (dialogResult.canceled) {
          return
        }
        toast({
          title: 'Download failed',
          description: 'Could not open the folder picker.',
          variant: 'destructive'
        })
        return
      }

      const providerCache = new Map<
        string,
        Awaited<ReturnType<typeof trpcUtils.provider.getById.fetch>> | null
      >()
      let successCount = 0
      let errorCount = 0

      const queue = [...downloadItems]
      const concurrency = 3
      const workers = Array.from({ length: Math.min(concurrency, queue.length) }).map(async () => {
        while (queue.length > 0) {
          const item = queue.shift()
          if (!item) return
          try {
            if (!providerCache.has(item.providerId)) {
              const provider = await trpcUtils.provider.getById.fetch({ id: item.providerId })
              providerCache.set(item.providerId, provider ?? null)
            }
            const provider = providerCache.get(item.providerId)
            if (!provider) {
              errorCount += 1
              continue
            }
            const savePath = buildSavePath(dialogResult.folderPath, item.name)
            const result = await downloadToFileMutation.mutateAsync({
              provider,
              bucket: item.bucket,
              key: item.key,
              savePath
            })
            if (result.success) {
              successCount += 1
            } else {
              errorCount += 1
            }
          } catch {
            errorCount += 1
          }
        }
      })

      await Promise.all(workers)

      if (successCount > 0) {
        toast({
          title: 'Download complete',
          description: `${successCount} file${successCount > 1 ? `s` : ``} saved to ${dialogResult.folderPath}`
        })
      }
      if (errorCount > 0) {
        toast({
          title: 'Download failed',
          description: `${errorCount} file${errorCount > 1 ? `s` : ``} failed to download`,
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Download failed',
        description: error instanceof Error ? error.message : 'Unable to download files.',
        variant: 'destructive'
      })
    } finally {
      setIsBatchDownloading(false)
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

  // Loading state
  if (isLoading) {
    return <MyUploadsPageSkeleton />
  }
  console.log(isFetching)
  return (
    <div className="flex min-h-0 h-[calc(100vh-48px)] flex-col bg-white">
      <div className="p-6 pb-4">
        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            title="Total Files"
            value={stats?.totalFiles.toLocaleString() ?? '0'}
            icon={<IconFile size={20} />}
          />
          <StatCard
            title="Total Size"
            value={formatFileSize(stats?.totalSize ?? 0)}
            icon={<IconDatabase size={20} />}
          />
          <StatCard
            title="Recent Upload"
            value={
              stats?.recentUploads[0]
                ? format(new Date(stats.recentUploads[0].uploadedAt), 'MMM dd')
                : 'N/A'
            }
            icon={<IconClock size={20} />}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Upload History</h2>
            <Badge variant="secondary" className="rounded-full">
              {data?.total ?? 0}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <IconSearch
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Search by filename..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value)
                  setPage(1)
                }}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => refetch()} className="h-9 w-9">
              <IconRefresh size={16} className={cn(isFetching ? 'animate-spin' : '')} />
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-6 pb-6">
          {data && data.data.length > 0 ? (
            <UploadHistoryTable
              data={data.data.map((item) => ({
                ...item,
                type: item.type as 'file' | 'folder'
              }))}
              selectable={true}
              selectedItems={selectedItems}
              onToggleSelection={handleToggleSelection}
              onToggleAll={handleToggleAll}
              onRowClick={handleRowClick}
              onDownload={handleDownload}
              onCopyUrl={getCopyUrl}
              onDelete={setDeleteTarget}
              isDeleting={deleteObjectMutation.isPending}
            />
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
      </ScrollArea>

      {data && (
        <div className="flex items-center justify-between border-t border-border px-6 py-3 text-sm text-muted-foreground">
          <span>Showing {data.data.length} items</span>
          {data.totalPages > 1 && (
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isFetching}
              >
                Previous
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages || isFetching}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
      {selectedCount > 0 && batchMenuOpen && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3 rounded-full border border-border bg-background px-4 py-2 shadow-lg">
            <span className="text-sm font-medium">{selectedCount} items selected</span>
            <Separator orientation="vertical" className="h-5" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBatchDownload}
              disabled={
                isBatchDownloading ||
                selectedCount === 0 ||
                Object.values(selectedItems).every((item) => item.type !== 'file')
              }
              className="h-8"
            >
              <IconDownload size={16} className="mr-1" />
              Download
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBatchDeleteDialogOpen(true)}
              className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <IconTrash size={16} className="mr-1" />
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancelSelection} className="h-8">
              Cancel
            </Button>
          </div>
        </div>
      )}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the file from storage and removes the upload history record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteObjectMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteObjectMutation.isPending}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteObjectMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} items?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the files from storage and removes the upload history records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteObjectsMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              disabled={deleteObjectsMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteObjectsMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* File Detail Sheet */}
      <FileDetailSheet
        open={fileDetailOpen}
        onOpenChange={setFileDetailOpen}
        file={selectedFileDetail?.file ?? null}
        provider={selectedFileDetail?.provider ?? ({} as TRPCProvider)}
        bucket={selectedFileDetail?.bucket ?? ''}
      />
    </div>
  )
}
