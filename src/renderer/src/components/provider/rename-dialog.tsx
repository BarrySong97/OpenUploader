import { useState, useEffect } from 'react'
import { IconPencil, IconLoader2 } from '@tabler/icons-react'
import type { Provider } from '@renderer/db'
import type { FileItem } from '@/lib/types'
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

interface RenameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  provider: Provider
  bucket: string
  file: FileItem | null
  onSuccess?: () => void
}

export function RenameDialog({
  open,
  onOpenChange,
  provider,
  bucket,
  file,
  onSuccess
}: RenameDialogProps) {
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const renameObjectMutation = trpc.provider.renameObject.useMutation()

  // Initialize with current file name when dialog opens
  useEffect(() => {
    if (open && file) {
      setNewName(file.name)
      setError(null)
    }
  }, [open, file])

  const validateName = (name: string): string | null => {
    if (!name.trim()) {
      return 'Name is required'
    }
    if (name.includes('/') || name.includes('\\')) {
      return 'Name cannot contain / or \\'
    }
    if (name.startsWith('.')) {
      return 'Name cannot start with .'
    }
    return null
  }

  const handleRename = async () => {
    if (!file) return

    const validationError = validateName(newName)
    if (validationError) {
      setError(validationError)
      return
    }

    if (newName.trim() === file.name) {
      // No change, just close
      handleClose()
      return
    }

    setError(null)

    try {
      const result = await renameObjectMutation.mutateAsync({
        provider,
        bucket,
        sourceKey: file.id,
        newName: newName.trim()
      })

      if (result.success) {
        onSuccess?.()
        handleClose()
      } else {
        setError(result.error || 'Failed to rename')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename')
    }
  }

  const handleClose = () => {
    if (!renameObjectMutation.isPending) {
      setNewName('')
      setError(null)
      onOpenChange(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !renameObjectMutation.isPending) {
      handleRename()
    }
  }

  if (!file) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename {file.type === 'folder' ? 'Folder' : 'File'}</DialogTitle>
          <DialogDescription>Enter a new name for {file.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-name">New name</Label>
            <Input
              id="new-name"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value)
                setError(null)
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter new name"
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={renameObjectMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleRename}
            disabled={!newName.trim() || renameObjectMutation.isPending}
          >
            {renameObjectMutation.isPending ? (
              <>
                <IconLoader2 size={16} className="mr-2 animate-spin" />
                Renaming...
              </>
            ) : (
              <>
                <IconPencil size={16} className="mr-2" />
                Rename
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
