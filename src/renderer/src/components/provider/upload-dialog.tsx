import { useState } from 'react'
import { IconUpload, IconX, IconFile, IconLoader2, IconPhoto } from '@tabler/icons-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { formatFileSize } from '@/lib/utils'

type CompressionPreset = 'thumbnail' | 'preview' | 'standard' | 'hd' | 'original'

const PRESET_LABELS: Record<CompressionPreset, string> = {
  thumbnail: 'Thumbnail (200px, 60%)',
  preview: 'Preview (800px, 75%)',
  standard: 'Standard (1920px, 85%)',
  hd: 'HD (4096px, 90%)',
  original: 'Original (no compression)'
}

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
  status: 'pending' | 'compressing' | 'uploading' | 'success' | 'error'
  error?: string
  compressedSize?: number
  isImage: boolean
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') && ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'].includes(file.type.toLowerCase())
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
  const [compressImages, setCompressImages] = useState(true)
  const [compressionPreset, setCompressionPreset] = useState<CompressionPreset>('standard')

  const uploadMutation = trpc.provider.uploadFile.useMutation()
  const compressMutation = trpc.image.compress.useMutation()

  const handleFilesSelected = (files: File[]) => {
    const newFiles: PendingFile[] = files.map((file) => ({
      file,
      status: 'pending',
      isImage: isImageFile(file)
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

      try {
        // Read file as base64
        let content = await fileToBase64(pendingFile.file)
        let filename = pendingFile.file.name
        let contentType = pendingFile.file.type || undefined

        // Compress image if enabled and file is an image
        if (compressImages && pendingFile.isImage && compressionPreset !== 'original') {
          // Update status to compressing
          setPendingFiles((prev) =>
            prev.map((f, idx) => (idx === i ? { ...f, status: 'compressing' } : f))
          )

          const compressResult = await compressMutation.mutateAsync({
            content,
            preset: compressionPreset,
            filename
          })

          if (compressResult.success && compressResult.content) {
            content = compressResult.content
            // Update filename extension if format changed
            if (compressResult.format && compressResult.format !== 'original') {
              const lastDotIndex = filename.lastIndexOf('.')
              const baseName = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename
              filename = `${baseName}.${compressResult.format === 'jpeg' ? 'jpg' : compressResult.format}`
              contentType = `image/${compressResult.format}`
            }
            // Update compressed size for display
            setPendingFiles((prev) =>
              prev.map((f, idx) =>
                idx === i ? { ...f, compressedSize: compressResult.compressedSize } : f
              )
            )
          }
        }

        // Update status to uploading
        setPendingFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: 'uploading' } : f))
        )

        const key = prefix ? `${prefix}${filename}` : filename

        const result = await uploadMutation.mutateAsync({
          provider,
          bucket,
          key,
          content,
          contentType
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
  const hasImages = pendingFiles.some((f) => f.isImage)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <UploadZone onFilesSelected={handleFilesSelected} />

          {/* Compression options - only show if there are images */}
          {hasImages && (
            <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconPhoto size={16} className="text-muted-foreground" />
                  <Label htmlFor="compress-images" className="text-sm font-medium">
                    Compress images
                  </Label>
                </div>
                <Switch
                  id="compress-images"
                  checked={compressImages}
                  onCheckedChange={setCompressImages}
                  disabled={isUploading}
                />
              </div>
              {compressImages && (
                <div className="space-y-1.5">
                  <Label htmlFor="compression-preset" className="text-xs text-muted-foreground">
                    Compression preset
                  </Label>
                  <Select
                    value={compressionPreset}
                    onValueChange={(value) => setCompressionPreset(value as CompressionPreset)}
                    disabled={isUploading}
                  >
                    <SelectTrigger id="compression-preset" className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PRESET_LABELS) as CompressionPreset[]).map((preset) => (
                        <SelectItem key={preset} value={preset}>
                          {PRESET_LABELS[preset]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {pendingFiles.length > 0 && (
            <div className="max-h-48 space-y-2 overflow-auto">
              {pendingFiles.map((pendingFile, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-md border border-border p-2"
                >
                  {pendingFile.isImage ? (
                    <IconPhoto size={20} className="shrink-0 text-blue-500" />
                  ) : (
                    <IconFile size={20} className="shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{pendingFile.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(pendingFile.file.size)}
                      {pendingFile.compressedSize && pendingFile.compressedSize < pendingFile.file.size && (
                        <span className="text-green-600">
                          {' → '}{formatFileSize(pendingFile.compressedSize)}
                          {' ('}{Math.round((1 - pendingFile.compressedSize / pendingFile.file.size) * 100)}% smaller)
                        </span>
                      )}
                      {pendingFile.status === 'compressing' && ' • Compressing...'}
                      {pendingFile.status === 'uploading' && ' • Uploading...'}
                      {pendingFile.status === 'success' && ' • Done'}
                      {pendingFile.status === 'error' && ` • ${pendingFile.error}`}
                    </p>
                  </div>
                  {(pendingFile.status === 'uploading' || pendingFile.status === 'compressing') ? (
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
