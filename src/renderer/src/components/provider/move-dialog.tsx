import { useState, useEffect } from 'react'
import { IconFolderSymlink, IconLoader2, IconFolder, IconChevronRight } from '@tabler/icons-react'
import type { Provider } from '@renderer/db'
import { trpc } from '@renderer/lib/trpc'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { FileItem } from '@/lib/types'

// Server-side file item type (modified is string)
interface ServerFileItem {
  id: string
  name: string
  type: 'file' | 'folder'
  size?: number
  modified?: string
  mimeType?: string
}

interface MoveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  provider: Provider
  bucket: string
  file: FileItem | null
  currentPrefix?: string
  onSuccess?: () => void
}

export function MoveDialog({
  open,
  onOpenChange,
  provider,
  bucket,
  file,
  onSuccess
}: MoveDialogProps) {
  const [selectedPath, setSelectedPath] = useState('')
  const [browsePath, setBrowsePath] = useState('')
  const [error, setError] = useState<string | null>(null)

  const moveObjectMutation = trpc.provider.moveObject.useMutation()

  // Fetch folders at current browse path
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

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedPath('')
      setBrowsePath('')
      setError(null)
    }
  }, [open])

  const folders = folderData?.files.filter((f) => f.type === 'folder') || []

  const handleMove = async () => {
    if (!file) return

    // Don't allow moving to the same location
    const currentFolder = file.id.substring(0, file.id.lastIndexOf('/') + 1)
    if (selectedPath === currentFolder) {
      setError('File is already in this location')
      return
    }

    setError(null)

    try {
      const result = await moveObjectMutation.mutateAsync({
        provider,
        bucket,
        sourceKey: file.id,
        destinationPrefix: selectedPath
      })

      if (result.success) {
        onSuccess?.()
        handleClose()
      } else {
        setError(result.error || 'Failed to move')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move')
    }
  }

  const handleClose = () => {
    if (!moveObjectMutation.isPending) {
      setSelectedPath('')
      setBrowsePath('')
      setError(null)
      onOpenChange(false)
    }
  }

  const handleFolderClick = (folder: ServerFileItem) => {
    setBrowsePath(folder.id)
  }

  const handleSelectFolder = (path: string) => {
    setSelectedPath(path)
  }

  const breadcrumbParts = browsePath
    .replace(/\/$/, '')
    .split('/')
    .filter(Boolean)

  if (!file) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Move {file.type === 'folder' ? 'Folder' : 'File'}</DialogTitle>
          <DialogDescription>
            Select a destination folder for <span className="font-medium">{file.name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Breadcrumb navigation */}
          <div className="flex items-center gap-1 text-sm">
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
          <ScrollArea className="h-64 rounded-md border">
            <div className="p-2">
              {/* Option to select current browsed folder */}
              <button
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted',
                  selectedPath === browsePath && 'bg-primary/10 text-primary'
                )}
                onClick={() => handleSelectFolder(browsePath)}
              >
                <IconFolder size={18} className="text-muted-foreground" />
                <span className="font-medium">
                  {browsePath ? `Current folder (${browsePath.replace(/\/$/, '').split('/').pop()})` : 'Root folder'}
                </span>
              </button>

              {isFoldersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <IconLoader2 size={24} className="animate-spin text-muted-foreground" />
                </div>
              ) : folders.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No subfolders in this location
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
                      onClick={() => handleSelectFolder(folder.id)}
                    >
                      <IconFolder size={18} className="text-muted-foreground" />
                      <span>{folder.name}</span>
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => handleFolderClick(folder)}
                    >
                      <IconChevronRight size={14} />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Selected destination */}
          {selectedPath !== undefined && (
            <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Move to: </span>
              <span className="font-medium">{selectedPath || '/ (root)'}</span>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={moveObjectMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={moveObjectMutation.isPending}>
            {moveObjectMutation.isPending ? (
              <>
                <IconLoader2 size={16} className="mr-2 animate-spin" />
                Moving...
              </>
            ) : (
              <>
                <IconFolderSymlink size={16} className="mr-2" />
                Move
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
