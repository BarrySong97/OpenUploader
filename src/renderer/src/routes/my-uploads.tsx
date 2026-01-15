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
  IconClock,
  IconCheck,
  IconX
} from '@tabler/icons-react'
import { trpc } from '@renderer/lib/trpc'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { UploadHistoryTableSkeleton } from '@/components/ui/table-skeleton'
import { Skeleton } from '@/components/ui/skeleton'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { format } from 'date-fns'
import { cn, formatFileSize } from '@/lib/utils'
import { getFileIcon } from '@/lib/file-utils'
import { PageLayout } from '@/components/layout/page-layout'
import { StatCard } from '@/components/dashboard/status-card'

export const Route = createFileRoute('/my-uploads')({
  component: MyUploadsPage
})

function MyUploadsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
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
  const pageSize = 50

  // Fetch upload history
  const { data, isLoading, isFetching, refetch } = trpc.uploadHistory.list.useQuery({
    query: searchQuery || undefined,
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

  const handleToggleSelection = (item: {
    id: string
    providerId: string
    bucket: string
    key: string
    type: 'file' | 'folder'
    name: string
  }, checked: boolean) => {
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
          type: item.type,
          name: item.name
        }
      }
      return next
    })
  }

  const handleClearSelection = () => {
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
      const providerCache = new Map<string, Awaited<ReturnType<typeof trpcUtils.provider.getById.fetch>> | null>()

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

  const handleDownload = async (providerId: string, bucket: string, key: string) => {
    try {
      // Get provider first
      const provider = await trpcUtils.provider.getById.fetch({ id: providerId })
      if (!provider) return

      const result = await trpcUtils.provider.getObjectUrl.fetch({
        provider,
        bucket,
        key
      })
      window.open(result.url, '_blank')
    } catch (error) {
      console.error('Failed to download:', error)
    }
  }

  const renderStatusBadge = (status: string, errorMessage?: string | null) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-500">
            <IconCheck size={14} className="mr-1" />
            Completed
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="destructive" title={errorMessage ?? undefined}>
            <IconX size={14} className="mr-1" />
            Failed
          </Badge>
        )
      case 'uploading':
        return (
          <Badge variant="secondary">
            <IconRefresh size={14} className="mr-1 animate-spin" />
            Uploading
          </Badge>
        )
      default:
        return <Badge variant="secondary">Pending</Badge>
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
          <UploadHistoryTableSkeleton />
        </div>
      </PageLayout>
    )
  }
  console.log(isFetching)
  return (
    <PageLayout>
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

      {/* Upload History Section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
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
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
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

        {data && data.data.length > 0 ? (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          data.data.length > 0 &&
                          (data.data.every((item) => selectedItems[item.id])
                            ? true
                            : data.data.some((item) => selectedItems[item.id])
                              ? 'indeterminate'
                              : false)
                        }
                        onCheckedChange={(value) =>
                          handleToggleAll(value === true || value === 'indeterminate')
                        }
                        aria-label="Select all"
                      />
                    </TableHead>
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
                      Status
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Uploaded
                    </TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((item) => {
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
                      <TableRow key={item.id} className="group">
                        <TableCell>
                          <Checkbox
                            checked={!!selectedItems[item.id]}
                            onCheckedChange={(value) =>
                              handleToggleSelection(
                                {
                                  id: item.id,
                                  providerId: item.providerId,
                                  bucket: item.bucket,
                                  key: item.key,
                                  type: item.type,
                                  name: item.name
                                },
                                value === true
                              )
                            }
                            aria-label={`Select ${item.name}`}
                          />
                        </TableCell>
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
                        <TableCell>{renderStatusBadge(item.status, item.errorMessage)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(item.uploadedAt), 'MMM dd, yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                            {item.type === 'file' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() =>
                                  handleDownload(item.providerId, item.bucket, item.key)
                                }
                              >
                                <IconDownload size={16} />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                'h-7 w-7 text-muted-foreground',
                                'hover:bg-red-50 hover:text-red-500',
                                'dark:hover:bg-red-900/20'
                              )}
                              onClick={() =>
                                setDeleteTarget({
                                  id: item.id,
                                  providerId: item.providerId,
                                  bucket: item.bucket,
                                  key: item.key,
                                  type: item.type,
                                  name: item.name
                                })
                              }
                              disabled={deleteObjectMutation.isPending}
                            >
                              <IconTrash size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
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
      {selectedCount > 0 && batchMenuOpen && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3 rounded-full border border-border bg-background px-4 py-2 shadow-lg">
            <span className="text-sm font-medium">{selectedCount} items selected</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBatchDeleteDialogOpen(true)}
              className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <IconTrash size={16} className="mr-1" />
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClearSelection} className="h-8">
              Clear selection
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBatchMenuOpen(false)}
              className="h-8"
            >
              Close
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
    </PageLayout>
  )
}
