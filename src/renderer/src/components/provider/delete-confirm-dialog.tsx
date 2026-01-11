import { useState } from 'react'
import { IconTrash, IconLoader2, IconAlertTriangle } from '@tabler/icons-react'
import type { FileItem } from '@/lib/types'
import { trpc, type TRPCProvider } from '@renderer/lib/trpc'
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

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  provider: TRPCProvider
  bucket: string
  file: FileItem | null
  onSuccess?: () => void
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  provider,
  bucket,
  file,
  onSuccess
}: DeleteConfirmDialogProps) {
  const [error, setError] = useState<string | null>(null)

  const deleteObjectMutation = trpc.provider.deleteObject.useMutation()

  const handleDelete = async () => {
    if (!file) return

    setError(null)

    try {
      const result = await deleteObjectMutation.mutateAsync({
        provider,
        bucket,
        key: file.id,
        isFolder: file.type === 'folder'
      })

      if (result.success) {
        onSuccess?.()
        onOpenChange(false)
      } else {
        setError(result.error || 'Failed to delete')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  const handleClose = () => {
    if (!deleteObjectMutation.isPending) {
      setError(null)
      onOpenChange(false)
    }
  }

  if (!file) return null

  const isFolder = file.type === 'folder'

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <IconAlertTriangle size={20} className="text-destructive" />
            Delete {isFolder ? 'Folder' : 'File'}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">{file.name}</span>?
            </p>
            {isFolder && (
              <p className="text-destructive">
                This will permanently delete the folder and all its contents.
              </p>
            )}
            <p>This action cannot be undone.</p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteObjectMutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteObjectMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteObjectMutation.isPending ? (
              <>
                <IconLoader2 size={16} className="mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <IconTrash size={16} className="mr-2" />
                Delete
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
