import { useState, useMemo } from 'react'
import {
  IconArrowLeft,
  IconRefresh,
  IconLoader2,
  IconFolder,
  IconUpload,
  IconFolderPlus
} from '@tabler/icons-react'
import type { Provider } from '@renderer/db'
import { trpc } from '@renderer/lib/trpc'
import { Breadcrumb } from '@renderer/components/file-browser/breadcrumb'
import { FileList } from '@renderer/components/file-browser/file-list'
import { UploadDialog } from '@renderer/components/provider/upload-dialog'
import { CreateFolderDialog } from '@renderer/components/provider/create-folder-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { FileItem } from '@/lib/types'

interface BucketBrowserProps {
  provider: Provider
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
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false)

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
      maxKeys: 100
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

  const handleNavigate = (index: number) => {
    if (index === -1) {
      // Home button clicked - go back to bucket list
      onBack()
    } else {
      // Navigate to specific path segment
      setPath(path.slice(0, index + 1))
    }
  }

  const handleFileClick = (file: FileItem) => {
    if (file.type === 'folder') {
      setPath([...path, file.name])
    } else {
      // TODO: Preview or download file
      console.log('File clicked:', file)
    }
  }

  const showLoading = isLoading || isFetching

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border bg-background px-6 py-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-8 px-2">
          <IconArrowLeft size={16} />
        </Button>
        <span className="font-medium">{bucket}</span>
        <div className="flex-1" />
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
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <IconFolder size={48} className="mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">This folder is empty</p>
          </div>
        ) : (
          <>
            <FileList files={files} onFileClick={handleFileClick} />
            {isFetching && (
              <div className="flex items-center justify-center py-2">
                <IconLoader2 size={16} className="animate-spin text-muted-foreground" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Status bar */}
      {!isLoading && !error && (
        <div className="border-t border-border bg-muted/30 px-6 py-2 text-sm text-muted-foreground">
          {files.length} items
          {data?.hasMore && ' (more available)'}
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
    </div>
  )
}
