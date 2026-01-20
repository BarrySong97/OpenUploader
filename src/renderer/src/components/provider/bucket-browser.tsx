import { useState, useMemo, useRef } from 'react'
import {
  IconRefresh,
  IconLoader2,
  IconFolder,
  IconCloudUpload,
  IconFolderPlus,
  IconSearch,
  IconTrash,
  IconChevronRight,
  IconDownload,
  IconQuestionMark
} from '@tabler/icons-react'
import { trpc, type TRPCProvider } from '@renderer/lib/trpc'
import { FileList } from '@renderer/components/file-browser/file-list'
import { UploadFilesDrawer } from '@renderer/components/provider/upload-files-drawer'
import { CreateFolderDialog } from '@renderer/components/provider/create-folder-dialog'
import { DeleteConfirmDialog } from '@renderer/components/provider/delete-confirm-dialog'
import { RenameDialog } from '@renderer/components/provider/rename-dialog'
import { MoveDialog } from '@renderer/components/provider/move-dialog'
import { FileDetailSheet } from '@renderer/components/provider/file-detail-sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { FileListSkeleton } from '@/components/ui/table-skeleton'
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
import { toast } from '@/hooks/use-toast'
import { useNavigationStore } from '@renderer/stores/navigation-store'
import { useDownloadStore } from '@renderer/stores/download-store'
import { useDownloadFile } from '@/hooks/use-download-file'

interface BucketBrowserProps {
  provider: TRPCProvider
  bucket: string
}

export function BucketBrowser({ provider, bucket }: BucketBrowserProps) {
  // Use navigation store for path management
  const { currentPath: path, setPath } = useNavigationStore()

  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([])
  const [uploadDrawerOpen, setUploadDrawerOpen] = useState(false)
  const [selectedUploadFiles, setSelectedUploadFiles] = useState<File[]>([])
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  const [fileDetailOpen, setFileDetailOpen] = useState(false)
  const [actionFile, setActionFile] = useState<FileItem | null>(null)
  // State for selection, search, and drag-drop
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchInput, setSearchInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false)
  const [batchMoveDialogOpen, setBatchMoveDialogOpen] = useState(false)
  const [isBatchDownloading, setIsBatchDownloading] = useState(false)
  // Upload drop zone state
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const trpcUtils = trpc.useUtils()
  const moveObjectsMutation = trpc.provider.moveObjects.useMutation()
  const deleteObjectsMutation = trpc.provider.deleteObjects.useMutation()
  const showOpenDirectoryMutation = trpc.provider.showOpenDirectory.useMutation()
  const downloadToFileMutation = trpc.provider.downloadToFile.useMutation()
  const { downloadFile } = useDownloadFile({ provider, bucket })
  const { addTask, updateTask, setDrawerOpen: setDownloadDrawerOpen } = useDownloadStore()

  // Build prefix from path segments
  const prefix = useMemo(() => {
    if (path.length === 0) return undefined
    const result = path.join('/') + '/'
    console.log('[BucketBrowser] Prefix calculated:', { path, prefix: result })
    return result
  }, [path])

  const listPrefix = useMemo(() => {
    const trimmedSearch = appliedSearch.trim()
    if (trimmedSearch) return trimmedSearch
    return prefix
  }, [appliedSearch, prefix])

  const { data, isLoading, isFetching, error, refetch } = trpc.provider.listObjects.useQuery(
    {
      provider,
      bucket,
      prefix: listPrefix,
      cursor,
      maxKeys: 30
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

  const handleApplySearch = (nextSearch: string) => {
    setAppliedSearch(nextSearch)
    setCursor(undefined)
    setCursorHistory([])
    setSelectedIds(new Set())
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

  const handleDownload = (file: FileItem) => {
    downloadFile({ key: file.id, fileName: file.name, fileSize: file.size || 0 })
  }

  const buildSavePath = (directory: string, fileName: string) => {
    const separator = window.api.platform.isWindows ? '\\' : '/'
    const trimmed = directory.replace(/[\\/]+$/, '')
    return `${trimmed}${separator}${fileName}`
  }

  const handleBatchDownload = async () => {
    if (selectedIds.size === 0 || isBatchDownloading) return
    const selectedFiles = files.filter((file) => selectedIds.has(file.id) && file.type === 'file')
    if (selectedFiles.length === 0) {
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

      setDownloadDrawerOpen(true)

      const queue = [...selectedFiles]
      const concurrency = 3
      const workers = Array.from({ length: Math.min(concurrency, queue.length) }).map(async () => {
        while (queue.length > 0) {
          const nextFile = queue.shift()
          if (!nextFile) return
          const taskId = addTask({
            key: nextFile.id,
            fileName: nextFile.name,
            fileSize: nextFile.size || 0,
            providerId: provider.id,
            bucket,
            status: 'downloading'
          })
          try {
            const savePath = buildSavePath(dialogResult.folderPath, nextFile.name)
            const result = await downloadToFileMutation.mutateAsync({
              provider,
              bucket,
              key: nextFile.id,
              savePath
            })
            if (result.success && result.filePath) {
              updateTask(taskId, {
                status: 'completed',
                completedAt: Date.now(),
                filePath: result.filePath
              })
            } else {
              updateTask(taskId, {
                status: 'error',
                error: result.error || 'Download failed'
              })
            }
          } catch (error) {
            updateTask(taskId, {
              status: 'error',
              error: error instanceof Error ? error.message : 'Download failed'
            })
          }
        }
      })

      await Promise.all(workers)
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

  const handleCopyUrl = async (file: FileItem): Promise<string> => {
    try {
      const result = await trpcUtils.provider.getPlainObjectUrl.fetch({
        provider,
        bucket,
        key: file.id
      })
      return result.url
    } catch (err) {
      console.error('Failed to get URL:', err)
      return ''
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

  // Upload drop zone handlers
  const handleUploadFiles = (files: File[]) => {
    setSelectedUploadFiles(files)
    setUploadDrawerOpen(true)
  }

  const handleDropZoneDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDropZoneDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDropZoneDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleUploadFiles(files)
    }
  }

  const handleDropZoneClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      handleUploadFiles(files)
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
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

  const hasPrevPage = cursorHistory.length > 0
  const hasNextPage = data?.hasMore ?? false

  const showLoading = isLoading || isFetching

  return (
    <div className="flex h-[calc(100vh-48px)] flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border px-6 py-2">
        <Button size="sm" onClick={() => setCreateFolderDialogOpen(true)} className="h-8">
          <IconFolderPlus size={16} className="mr-2" />
          New Folder
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={showLoading}
          className="h-8 px-2"
        >
          <IconRefresh size={16} className={cn(showLoading && 'animate-spin')} />
        </Button>
        <div className="flex-1" />
        {/* Search input */}
        <div className="relative w-64">
          <IconSearch
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search files... (press Enter)"
            value={searchInput}
            onChange={(e) => {
              const nextValue = e.target.value
              setSearchInput(nextValue)
              // Clear applied search if input is cleared
              if (!nextValue) {
                handleApplySearch('')
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleApplySearch(searchInput)
              }
            }}
            className="h-8 pl-8 text-sm"
          />
          <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="pointer-events-auto inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground">
                  <IconQuestionMark size={12} />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={6}>
                S3 does not support filename search. Search works by key prefix. To find a file by
                name, include its folder key in the prefix. Without a folder key, it matches only
                items in the current path.
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Upload Drop Zone */}
        <div
          onDragOver={handleDropZoneDragOver}
          onDragLeave={handleDropZoneDragLeave}
          onDrop={handleDropZoneDrop}
          onClick={handleDropZoneClick}
          className={cn(
            'mb-6 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed py-4 transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/30'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
          />
          <IconCloudUpload size={20} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {isDragging ? 'Drop files here' : 'Click or drag files to upload'}
          </span>
        </div>

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
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <IconFolder size={48} className="mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {appliedSearch ? 'No files match your search' : 'This folder is empty'}
            </p>
          </div>
        ) : (
          <>
            <FileList
              files={files}
              onFileClick={handleFileClick}
              onFileDoubleClick={handleFileDoubleClick}
              onDownload={handleDownload}
              onCopyUrl={handleCopyUrl}
              onDelete={handleDelete}
              onRename={handleRename}
              onMove={handleMove}
              selectable={true}
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
      {!error && (
        <div className="flex items-center justify-between border-t border-border px-6 py-3 text-sm text-muted-foreground">
          <span>Showing {files.length} items</span>
          {(hasPrevPage || hasNextPage) && (
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevPage}
                disabled={!hasPrevPage || isFetching}
              >
                Previous
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextPage}
                disabled={!hasNextPage || isFetching}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Floating Batch Action Menu */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3 rounded-full border border-border bg-background px-4 py-2 shadow-lg">
            <span className="text-sm font-medium">{selectedIds.size} items selected</span>
            <Separator orientation="vertical" className="h-5" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBatchDownload}
              disabled={
                isBatchDownloading ||
                selectedIds.size === 0 ||
                files.every((file) => !selectedIds.has(file.id) || file.type !== 'file')
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              className="h-8"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <UploadFilesDrawer
        open={uploadDrawerOpen}
        onOpenChange={setUploadDrawerOpen}
        files={selectedUploadFiles}
        provider={provider}
        bucket={bucket}
        prefix={prefix}
        onUploadStart={() => {
          console.log('[BucketBrowser] Upload started:', {
            bucket,
            prefix,
            fileCount: selectedUploadFiles.length,
            path
          })
          // Close dialogs and clear selection on upload start
          setSelectedUploadFiles([])
        }}
        onUploadComplete={() => {
          console.log('[BucketBrowser] Upload completed, refreshing...')
          // Refresh the file list after all uploads complete
          refetch()
        }}
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

  const breadcrumbParts = browsePath.replace(/\/$/, '').split('/').filter(Boolean)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Move {selectedCount} items</DialogTitle>
          <DialogDescription>Select a destination folder for the selected items</DialogDescription>
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
              <span className="font-medium">{browsePath ? `Current folder` : 'Root folder'}</span>
            </button>

            {isFoldersLoading ? (
              <div className="flex items-center justify-center py-8">
                <IconLoader2 size={24} className="animate-spin text-muted-foreground" />
              </div>
            ) : folders.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No subfolders</div>
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
