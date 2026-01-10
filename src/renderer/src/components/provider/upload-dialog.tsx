import { useState } from 'react'
import { IconUpload, IconX, IconFile, IconLoader2 } from '@tabler/icons-react'
import type { Provider } from '@renderer/db'
import { trpc } from '@renderer/lib/trpc'
import { UploadZone } from '@renderer/components/upload/upload-zone'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatFileSize } from '@/lib/utils'

interface UploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  provider: Provider
  bucket: string
  prefix?: string
  onSuccess?: () => void
}

interface PendingFile {
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

export function UploadDialog({
  open,
  onOpenChange,
  provider,
  bucket,
  prefix,
  onSuccess
}: UploadDialogProps) {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const uploadMutation = trpc.provider.uploadFile.useMutation()

  const handleFilesSelected = (files: File[]) => {
    const newFiles: PendingFile[] = files.map((file) => ({
      file,
      status: 'pending'
    }))
    setPendingFiles((prev) => [...prev, ...newFiles])
  }

  const handleRemoveFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (pendingFiles.length === 0) return

    setIsUploading(true)

    for (let i = 0; i < pendingFiles.length; i++) {
      const pendingFile = pendingFiles[i]
      if (pendingFile.status !== 'pending') continue

      // Update status to uploading
      setPendingFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: 'uploading' } : f))
      )

      try {
        // Read file as base64
        const content = await fileToBase64(pendingFile.file)
        const key = prefix ? `${prefix}${pendingFile.file.name}` : pendingFile.file.name

        const result = await uploadMutation.mutateAsync({
          provider,
          bucket,
          key,
          content,
          contentType: pendingFile.file.type || undefined
        })

        if (result.success) {
          setPendingFiles((prev) =>
            prev.map((f, idx) => (idx === i ? { ...f, status: 'success' } : f))
          )
        } else {
          setPendingFiles((prev) =>
            prev.map((f, idx) =>
              idx === i ? { ...f, status: 'error', error: result.error } : f
            )
          )
        }
      } catch (error) {
        setPendingFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' }
              : f
          )
        )
      }
    }

    setIsUploading(false)

    // Check if all uploads succeeded
    const allSuccess = pendingFiles.every((f) => f.status === 'success' || f.status === 'pending')
    if (allSuccess) {
      onSuccess?.()
      handleClose()
    }
  }

  const handleClose = () => {
    if (!isUploading) {
      setPendingFiles([])
      onOpenChange(false)
    }
  }

  const pendingCount = pendingFiles.filter((f) => f.status === 'pending').length
  const successCount = pendingFiles.filter((f) => f.status === 'success').length

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <UploadZone onFilesSelected={handleFilesSelected} />

          {pendingFiles.length > 0 && (
            <div className="max-h-48 space-y-2 overflow-auto">
              {pendingFiles.map((pendingFile, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-md border border-border p-2"
                >
                  <IconFile size={20} className="shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{pendingFile.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(pendingFile.file.size)}
                      {pendingFile.status === 'uploading' && ' • Uploading...'}
                      {pendingFile.status === 'success' && ' • Done'}
                      {pendingFile.status === 'error' && ` • ${pendingFile.error}`}
                    </p>
                  </div>
                  {pendingFile.status === 'uploading' ? (
                    <IconLoader2 size={16} className="animate-spin text-muted-foreground" />
                  ) : pendingFile.status === 'pending' ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemoveFile(index)}
                    >
                      <IconX size={16} />
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={pendingCount === 0 || isUploading}
          >
            {isUploading ? (
              <>
                <IconLoader2 size={16} className="mr-2 animate-spin" />
                Uploading ({successCount}/{pendingFiles.length})
              </>
            ) : (
              <>
                <IconUpload size={16} className="mr-2" />
                Upload {pendingCount} {pendingCount === 1 ? 'file' : 'files'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
