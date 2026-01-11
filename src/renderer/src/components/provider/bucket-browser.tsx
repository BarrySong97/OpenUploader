import { useState, useMemo } from 'react'
import {
  IconArrowLeft,
  IconRefresh,
  IconLoader2,
  IconFolder,
  IconUpload,
  IconFolderPlus,
  IconChevronLeft,
  IconChevronRight,
  IconSearch,
  IconCheckbox
} from '@tabler/icons-react'
import { trpc, type TRPCProvider } from '@renderer/lib/trpc'
import { Breadcrumb } from '@renderer/components/file-browser/breadcrumb'
import { FileList } from '@renderer/components/file-browser/file-list'
import { BatchToolbar } from '@renderer/components/file-browser/batch-toolbar'
import { UploadDialog } from '@renderer/components/provider/upload-dialog'
import { CreateFolderDialog } from '@renderer/components/provider/create-folder-dialog'
import { DeleteConfirmDialog } from '@renderer/components/provider/delete-confirm-dialog'
import { RenameDialog } from '@renderer/components/provider/rename-dialog'
import { MoveDialog } from '@renderer/components/provider/move-dialog'
import { FileDetailSheet } from '@renderer/components/provider/file-detail-sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { FileItem } from '@/lib/types'

interface BucketBrowserProps {
  provider: TRPCProvider
  bucket: string
  onBack: () => void
}

function FileListSkeleton() {
  return (
    <div className="overflow-auto">
      <table className="w-full">
        <thead className="border-b border-border bg-muted/30">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Name</th>
            <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Size</th>
            <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
              Modified
            </th>
            <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, i) => (
            <tr key={i} className="border-b border-border">
              <td className="px-6 py-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </td>
              <td className="px-6 py-4">
                <Skeleton className="h-4 w-16" />
              </td>
              <td className="px-6 py-2">
                <Skeleton className="h-4 w-24" />
              </td>
              <td className="px-6 py-2 text-right">
                <Skeleton className="ml-auto h-8 w-8" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function BucketBrowser({ provider, bucket, onBack }: BucketBrowserProps) {
  const [path, setPath] = useState<string[]>([])
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([])
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  const [fileDetailOpen, setFileDetailOpen] = useState(false)
  const [actionFile, setActionFile] = useState<FileItem | null>(null)
  // New state for batch operations, search, and drag-drop
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false)
  const [batchMoveDialogOpen, setBatchMoveDialogOpen] = useState(false)

  const trpcUtils = trpc.useUtils()
  const moveObjectsMutation = trpc.provider.moveObjects.useMutation()
  const deleteObjectsMutation = trpc.provider.deleteObjects.useMutation()

  // Build prefix from path segments
  const prefix = useMemo(() => {
    if (path.length === 0) return undefined
    return path.join('/') + '/'
  }, [path])

  const { data, isLoading, isFetching, error, refetch } = trpc.provider.listObjects.useQuery(
    {
      provider,
      bucket,
      prefix,
      cursor,
      maxKeys: 50
    },
    {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000 // 5 minutes
    }
  )

  // Convert service FileItem to renderer FileItem (modified string -> Date)
  const files: FileItem[] = useMemo(() => {
    if (!data?.files) return []
    return data.files.map((file) => ({
      id: file.id,
      name: file.name,
      type: file.type,
      size: file.size,
      modified: file.modified ? new Date(file.modified) : new Date(),
      mimeType: file.mimeType
    }))
  }, [data?.files])

  // Filter files by search query
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files
    const query = searchQuery.toLowerCase()
    return files.filter((file) => file.name.toLowerCase().includes(query))
  }, [files, searchQuery])

  const handleNavigate = (index: number) => {
    if (index === -1) {
      // Home button clicked - go to bucket root (clear path)
      setPath([])
    } else {
      // Navigate to specific path segment
      setPath(path.slice(0, index + 1))
    }
    // Reset pagination when navigating
    setCursor(undefined)
    setCursorHistory([])
  }

  const handleFileClick = (file: FileItem) => {
    if (file.type === 'folder') {
      setPath([...path, file.name])
      // Reset pagination when entering folder
      setCursor(undefined)
      setCursorHistory([])
    } else {
      // Single click on file - open detail sheet
      setSelectedFile(file)
      setFileDetailOpen(true)
    }
  }

  const handleFileDoubleClick = (file: FileItem) => {
    // Double click on folder also enters it (for consistency)
    if (file.type === 'folder') {
      setPath([...path, file.name])
      setCursor(undefined)
      setCursorHistory([])
    }
    // Double click on file does nothing extra (already opened on single click)
  }

  const handleDownload = async (file: FileItem) => {
    try {
      const result = await trpcUtils.provider.getObjectUrl.fetch({
        provider,
        bucket,
        key: file.id
      })
      window.open(result.url, '_blank')
    } catch (err) {
      console.error('Failed to get download URL:', err)
    }
  }

  const handleCopyUrl = async (file: FileItem) => {
    try {
      const result = await trpcUtils.provider.getObjectUrl.fetch({
        provider,
        bucket,
        key: file.id
      })
      await navigator.clipboard.writeText(result.url)
    } catch (err) {
      console.error('Failed to copy URL:', err)
    }
  }

  const handleDelete = (file: FileItem) => {
    setActionFile(file)
    setDeleteDialogOpen(true)
  }

  const handleRename = (file: FileItem) => {
    setActionFile(file)
    setRenameDialogOpen(true)
  }

  const handleMove = (file: FileItem) => {
    setActionFile(file)
    setMoveDialogOpen(true)
  }

  // Batch operations
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return

    try {
      const result = await deleteObjectsMutation.mutateAsync({
        provider,
        bucket,
        keys: Array.from(selectedIds)
      })

      if (result.success) {
        setSelectedIds(new Set())
        setBatchDeleteDialogOpen(false)
        refetch()
      }
    } catch (err) {
      console.error('Failed to delete files:', err)
    }
  }

  const handleBatchMoveConfirm = async (destinationPrefix: string) => {
    if (selectedIds.size === 0) return

    try {
      const result = await moveObjectsMutation.mutateAsync({
        provider,
        bucket,
        sourceKeys: Array.from(selectedIds),
        destinationPrefix
      })

      if (result.success) {
        setSelectedIds(new Set())
        setBatchMoveDialogOpen(false)
        refetch()
      }
    } catch (err) {
      console.error('Failed to move files:', err)
    }
  }

  const handleDragDrop = async (targetFolder: FileItem, sourceIds: string[]) => {
    try {
      const result = await moveObjectsMutation.mutateAsync({
        provider,
        bucket,
        sourceKeys: sourceIds,
        destinationPrefix: targetFolder.id
      })

      if (result.success) {
        setSelectedIds(new Set())
        refetch()
      }
    } catch (err) {
      console.error('Failed to move files:', err)
    }
  }

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode)
    if (selectionMode) {
      setSelectedIds(new Set())
    }
  }

  const handleNextPage = () => {
    if (data?.nextCursor) {
      setCursorHistory([...cursorHistory, cursor])
      setCursor(data.nextCursor)
    }
  }

  const handlePrevPage = () => {
    if (cursorHistory.length > 0) {
      const newHistory = [...cursorHistory]
      const prevCursor = newHistory.pop()
      setCursorHistory(newHistory)
      setCursor(prevCursor)
    }
  }

  const currentPage = cursorHistory.length + 1
  const hasPrevPage = cursorHistory.length > 0
  const hasNextPage = data?.hasMore ?? false

  const showLoading = isLoading || isFetching

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border bg-background px-6 py-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-8 px-2">
          <IconArrowLeft size={16} />
        </Button>
        <span className="font-medium">{bucket}</span>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-6 py-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setUploadDialogOpen(true)}
          className="h-8"
        >
          <IconUpload size={16} className="mr-2" />
          Upload
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCreateFolderDialogOpen(true)}
          className="h-8"
        >
          <IconFolderPlus size={16} className="mr-2" />
          New Folder
        </Button>
        <Button
          variant={selectionMode ? 'default' : 'outline'}
          size="sm"
          onClick={toggleSelectionMode}
          className="h-8"
        >
          <IconCheckbox size={16} className="mr-2" />
          Select
        </Button>
        <div className="flex-1" />
        {/* Search input */}
        <div className="relative w-48">
          <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={showLoading}
          className="h-8 px-2"
        >
          <IconRefresh size={16} className={cn(showLoading && 'animate-spin')} />
        </Button>
      </div>

      {/* Breadcrumb */}
      <Breadcrumb path={path} onNavigate={handleNavigate} />

      {/* Batch Toolbar */}
      {selectionMode && (
        <BatchToolbar
          selectedCount={selectedIds.size}
          onDelete={() => setBatchDeleteDialogOpen(true)}
          onMove={() => setBatchMoveDialogOpen(true)}
          onClearSelection={() => setSelectedIds(new Set())}
        />
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <FileListSkeleton />
        ) : error ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <p className="text-destructive">{error.message}</p>
              <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                Try Again
              </Button>
            </div>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <IconFolder size={48} className="mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {searchQuery ? 'No files match your search' : 'This folder is empty'}
            </p>
          </div>
        ) : (
          <>
            <FileList
              files={filteredFiles}
              onFileClick={handleFileClick}
              onFileDoubleClick={handleFileDoubleClick}
              onDownload={handleDownload}
              onCopyUrl={handleCopyUrl}
              onDelete={handleDelete}
              onRename={handleRename}
              onMove={handleMove}
              selectable={selectionMode}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              draggable={true}
              onDrop={handleDragDrop}
            />
            {isFetching && (
              <div className="flex items-center justify-center py-2">
                <IconLoader2 size={16} className="animate-spin text-muted-foreground" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Status bar with pagination */}
      {!isLoading && !error && (
        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-6 py-2 text-sm text-muted-foreground">
          <span>{filteredFiles.length} items{searchQuery && ` (filtered from ${files.length})`}</span>
          {(hasPrevPage || hasNextPage) && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevPage}
                disabled={!hasPrevPage || isFetching}
                className="h-7 px-2"
              >
                <IconChevronLeft size={16} />
              </Button>
              <span className="text-xs">Page {currentPage}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextPage}
                disabled={!hasNextPage || isFetching}
                className="h-7 px-2"
              >
                <IconChevronRight size={16} />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        provider={provider}
        bucket={bucket}
        prefix={prefix}
        onSuccess={() => refetch()}
      />
      <CreateFolderDialog
        open={createFolderDialogOpen}
        onOpenChange={setCreateFolderDialogOpen}
        provider={provider}
        bucket={bucket}
        prefix={prefix}
        onSuccess={() => refetch()}
      />

      {/* File Detail Sheet */}
      <FileDetailSheet
        open={fileDetailOpen}
        onOpenChange={setFileDetailOpen}
        file={selectedFile}
        provider={provider}
        bucket={bucket}
      />

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        provider={provider}
        bucket={bucket}
        file={actionFile}
        onSuccess={() => refetch()}
      />

      {/* Rename Dialog */}
      <RenameDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        provider={provider}
        bucket={bucket}
        file={actionFile}
        onSuccess={() => refetch()}
      />

      {/* Move Dialog */}
      <MoveDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        provider={provider}
        bucket={bucket}
        file={actionFile}
        currentPrefix={prefix}
        onSuccess={() => refetch()}
      />

      {/* Batch Delete Confirm Dialog */}
      <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} items?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected files. This action cannot be undone.
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

      {/* Batch Move Dialog - reuse MoveDialog with a dummy file */}
      {batchMoveDialogOpen && (
        <BatchMoveDialog
          open={batchMoveDialogOpen}
          onOpenChange={setBatchMoveDialogOpen}
          provider={provider}
          bucket={bucket}
          selectedCount={selectedIds.size}
          onConfirm={handleBatchMoveConfirm}
          isLoading={moveObjectsMutation.isPending}
        />
      )}
    </div>
  )
}

// Batch Move Dialog Component
interface BatchMoveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  provider: TRPCProvider
  bucket: string
  selectedCount: number
  onConfirm: (destinationPrefix: string) => void
  isLoading: boolean
}

function BatchMoveDialog({
  open,
  onOpenChange,
  provider,
  bucket,
  selectedCount,
  onConfirm,
  isLoading
}: BatchMoveDialogProps) {
  const [selectedPath, setSelectedPath] = useState('')
  const [browsePath, setBrowsePath] = useState('')

  const { data: folderData, isLoading: isFoldersLoading } = trpc.provider.listObjects.useQuery(
    {
      provider,
      bucket,
      prefix: browsePath,
      maxKeys: 100
    },
    {
      enabled: open
    }
  )

  const folders = folderData?.files.filter((f) => f.type === 'folder') || []

  const breadcrumbParts = browsePath
    .replace(/\/$/, '')
    .split('/')
    .filter(Boolean)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Move {selectedCount} items</DialogTitle>
          <DialogDescription>
            Select a destination folder for the selected items
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Breadcrumb navigation */}
          <div className="flex items-center gap-1 text-sm flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-7 px-2', !browsePath && 'bg-muted')}
              onClick={() => {
                setBrowsePath('')
                setSelectedPath('')
              }}
            >
              Root
            </Button>
            {breadcrumbParts.map((part, index) => {
              const path = breadcrumbParts.slice(0, index + 1).join('/') + '/'
              return (
                <div key={path} className="flex items-center">
                  <IconChevronRight size={14} className="text-muted-foreground" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn('h-7 px-2', browsePath === path && 'bg-muted')}
                    onClick={() => setBrowsePath(path)}
                  >
                    {part}
                  </Button>
                </div>
              )
            })}
          </div>

          {/* Folder list */}
          <div className="h-64 overflow-auto rounded-md border p-2">
            <button
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted',
                selectedPath === browsePath && 'bg-primary/10 text-primary'
              )}
              onClick={() => setSelectedPath(browsePath)}
            >
              <IconFolder size={18} className="text-muted-foreground" />
              <span className="font-medium">
                {browsePath ? `Current folder` : 'Root folder'}
              </span>
            </button>

            {isFoldersLoading ? (
              <div className="flex items-center justify-center py-8">
                <IconLoader2 size={24} className="animate-spin text-muted-foreground" />
              </div>
            ) : folders.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No subfolders
              </div>
            ) : (
              folders.map((folder) => (
                <div
                  key={folder.id}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted',
                    selectedPath === folder.id && 'bg-primary/10 text-primary'
                  )}
                >
                  <button
                    className="flex flex-1 items-center gap-2"
                    onClick={() => setSelectedPath(folder.id)}
                  >
                    <IconFolder size={18} className="text-muted-foreground" />
                    <span>{folder.name}</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => setBrowsePath(folder.id)}
                  >
                    <IconChevronRight size={14} />
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Selected destination */}
          <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Move to: </span>
            <span className="font-medium">{selectedPath || '/ (root)'}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(selectedPath)} disabled={isLoading}>
            {isLoading ? 'Moving...' : 'Move'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
