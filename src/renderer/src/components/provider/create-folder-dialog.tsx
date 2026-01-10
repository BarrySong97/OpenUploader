import { useState } from 'react'
import { IconFolderPlus, IconLoader2 } from '@tabler/icons-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CreateFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  provider: Provider
  bucket: string
  prefix?: string
  onSuccess?: () => void
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  provider,
  bucket,
  prefix,
  onSuccess
}: CreateFolderDialogProps) {
  const [folderName, setFolderName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const createFolderMutation = trpc.provider.createFolder.useMutation()

  const validateFolderName = (name: string): string | null => {
    if (!name.trim()) {
      return 'Folder name is required'
    }
    if (name.includes('/') || name.includes('\\')) {
      return 'Folder name cannot contain / or \\'
    }
    if (name.startsWith('.')) {
      return 'Folder name cannot start with .'
    }
    return null
  }

  const handleCreate = async () => {
    const validationError = validateFolderName(folderName)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)

    try {
      const path = prefix ? `${prefix}${folderName.trim()}` : folderName.trim()

      const result = await createFolderMutation.mutateAsync({
        provider,
        bucket,
        path
      })

      if (result.success) {
        onSuccess?.()
        handleClose()
      } else {
        setError(result.error || 'Failed to create folder')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder')
    }
  }

  const handleClose = () => {
    if (!createFolderMutation.isPending) {
      setFolderName('')
      setError(null)
      onOpenChange(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !createFolderMutation.isPending) {
      handleCreate()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Folder</DialogTitle>
          <DialogDescription>
            Create a new folder in {prefix ? `/${prefix}` : 'root'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder name</Label>
            <Input
              id="folder-name"
              value={folderName}
              onChange={(e) => {
                setFolderName(e.target.value)
                setError(null)
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter folder name"
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={createFolderMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!folderName.trim() || createFolderMutation.isPending}
          >
            {createFolderMutation.isPending ? (
              <>
                <IconLoader2 size={16} className="mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <IconFolderPlus size={16} className="mr-2" />
                Create
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
