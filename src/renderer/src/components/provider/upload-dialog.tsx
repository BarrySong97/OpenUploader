import { useState } from 'react'
import { IconUpload, IconX, IconFile, IconLoader2, IconPhoto } from '@tabler/icons-react'
import { trpc, type TRPCProvider } from '@renderer/lib/trpc'
import { UploadZone } from '@renderer/components/upload/upload-zone'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { formatFileSize } from '@/lib/utils'

type CompressionPreset = 'thumbnail' | 'preview' | 'standard' | 'hd'

const PRESET_LABELS: Record<CompressionPreset, string> = {
  thumbnail: 'Thumbnail (200px, 60%)',
  preview: 'Preview (800px, 75%)',
  standard: 'Standard (1920px, 85%)',
  hd: 'HD (4096px, 90%)'
}

interface UploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  provider: TRPCProvider
  bucket: string
  prefix?: string
  onSuccess?: () => void
}

interface UploadTask {
  preset: CompressionPreset | 'original'
  status: 'pending' | 'compressing' | 'uploading' | 'success' | 'error'
  compressedSize?: number
  error?: string
}

interface PendingFile {
  file: File
  isImage: boolean
  tasks: UploadTask[]
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') && ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'].includes(file.type.toLowerCase())
}

function generateFilename(
  originalName: string,
  preset: CompressionPreset | 'original',
  width?: number,
  height?: number,
  format?: string
): string {
  const lastDotIndex = originalName.lastIndexOf('.')
  const baseName = lastDotIndex > 0 ? originalName.substring(0, lastDotIndex) : originalName
  const originalExt = lastDotIndex > 0 ? originalName.substring(lastDotIndex + 1) : ''

  // Build suffix with preset and resolution
  const resolutionSuffix = width && height ? `_${width}x${height}` : ''
  const presetSuffix = `_${preset}`

  if (preset === 'original') {
    // For original, keep original extension but add _original and resolution
    return `${baseName}${presetSuffix}${resolutionSuffix}.${originalExt}`
  }

  // For compressed, use the new format extension
  const ext = format === 'jpeg' ? 'jpg' : (format || originalExt)
  return `${baseName}${presetSuffix}${resolutionSuffix}.${ext}`
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
  const [selectedPresets, setSelectedPresets] = useState<CompressionPreset[]>(['preview', 'standard'])
  const [keepOriginal, setKeepOriginal] = useState(false)

  const uploadMutation = trpc.provider.uploadFile.useMutation()
  const compressMutation = trpc.image.compress.useMutation()
  const trpcUtils = trpc.useUtils()

  const handleFilesSelected = (files: File[]) => {
    const newFiles: PendingFile[] = files.map((file) => {
      const isImage = isImageFile(file)
      return { file, isImage, tasks: [] }
    })
    setPendingFiles((prev) => [...prev, ...newFiles])
  }

  // Rebuild tasks when compression settings change or files are added
  const rebuildTasks = (files: PendingFile[]): PendingFile[] => {
    return files.map((pf) => {
      // Only rebuild if all tasks are still pending (not started yet)
      const allPending = pf.tasks.every((t) => t.status === 'pending')
      if (!allPending && pf.tasks.length > 0) {
        return pf // Keep existing tasks if upload has started
      }

      const tasks: UploadTask[] = []
      if (pf.isImage && compressImages) {
        for (const preset of selectedPresets) {
          tasks.push({ preset, status: 'pending' })
        }
        if (keepOriginal) {
          tasks.push({ preset: 'original', status: 'pending' })
        }
      } else {
        tasks.push({ preset: 'original', status: 'pending' })
      }
      return { ...pf, tasks }
    })
  }

  // Update tasks when settings change
  const pendingFilesWithTasks = rebuildTasks(pendingFiles)

  const handleRemoveFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (pendingFilesWithTasks.length === 0) return

    // Freeze the tasks into state before starting upload
    const filesToUpload = pendingFilesWithTasks
    setPendingFiles(filesToUpload)

    setIsUploading(true)

    // Helper to update a specific task's status
    const updateTaskStatus = (
      fileIndex: number,
      taskIndex: number,
      updates: Partial<UploadTask>
    ) => {
      setPendingFiles((prev) =>
        prev.map((f, fi) =>
          fi === fileIndex
            ? {
                ...f,
                tasks: f.tasks.map((t, ti) =>
                  ti === taskIndex ? { ...t, ...updates } : t
                )
              }
            : f
        )
      )
    }

    for (let fileIndex = 0; fileIndex < filesToUpload.length; fileIndex++) {
      const pendingFile = filesToUpload[fileIndex]

      // Read file as base64 once
      const originalContent = await fileToBase64(pendingFile.file)
      const originalFilename = pendingFile.file.name
      const originalContentType = pendingFile.file.type || undefined

      // Get original image info for resolution (only for images)
      let originalWidth: number | undefined
      let originalHeight: number | undefined
      if (pendingFile.isImage) {
        try {
          const imageInfo = await trpcUtils.image.getInfo.fetch({ content: originalContent })
          originalWidth = imageInfo.width
          originalHeight = imageInfo.height
        } catch {
          // Ignore error, will upload without resolution in filename
        }
      }

      for (let taskIndex = 0; taskIndex < pendingFile.tasks.length; taskIndex++) {
        const task = pendingFile.tasks[taskIndex]
        if (task.status !== 'pending') continue

        try {
          let content = originalContent
          let filename = originalFilename
          let contentType = originalContentType

          if (task.preset === 'original') {
            // Upload original with _original suffix and resolution
            filename = generateFilename(
              originalFilename,
              'original',
              originalWidth,
              originalHeight
            )
          } else {
            // Compress the image
            updateTaskStatus(fileIndex, taskIndex, { status: 'compressing' })

            const compressResult = await compressMutation.mutateAsync({
              content: originalContent,
              preset: task.preset,
              filename: originalFilename
            })

            if (compressResult.success && compressResult.content) {
              content = compressResult.content
              filename = generateFilename(
                originalFilename,
                task.preset,
                compressResult.width,
                compressResult.height,
                compressResult.format
              )
              if (compressResult.format && compressResult.format !== 'original') {
                contentType = `image/${compressResult.format}`
              }
              updateTaskStatus(fileIndex, taskIndex, {
                compressedSize: compressResult.compressedSize
              })
            }
          }

          // Upload the file
          updateTaskStatus(fileIndex, taskIndex, { status: 'uploading' })

          const key = prefix ? `${prefix}${filename}` : filename

          const result = await uploadMutation.mutateAsync({
            provider,
            bucket,
            key,
            content,
            contentType
          })

          if (result.success) {
            updateTaskStatus(fileIndex, taskIndex, { status: 'success' })
          } else {
            updateTaskStatus(fileIndex, taskIndex, {
              status: 'error',
              error: result.error
            })
          }
        } catch (error) {
          updateTaskStatus(fileIndex, taskIndex, {
            status: 'error',
            error: error instanceof Error ? error.message : 'Upload failed'
          })
        }
      }
    }

    setIsUploading(false)

    // Check if all tasks succeeded
    setPendingFiles((currentFiles) => {
      const allSuccess = currentFiles.every((f) =>
        f.tasks.every((t) => t.status === 'success')
      )
      if (allSuccess) {
        onSuccess?.()
        // Schedule close after state update
        setTimeout(() => {
          setPendingFiles([])
          onOpenChange(false)
        }, 0)
      }
      return currentFiles
    })
  }

  const handleClose = () => {
    if (!isUploading) {
      setPendingFiles([])
      onOpenChange(false)
    }
  }

  // Count tasks across all files (use pendingFilesWithTasks for accurate counts)
  const totalTasks = pendingFilesWithTasks.reduce((sum, f) => sum + f.tasks.length, 0)
  const pendingTaskCount = pendingFilesWithTasks.reduce(
    (sum, f) => sum + f.tasks.filter((t) => t.status === 'pending').length,
    0
  )
  const successTaskCount = pendingFilesWithTasks.reduce(
    (sum, f) => sum + f.tasks.filter((t) => t.status === 'success').length,
    0
  )
  const hasImages = pendingFilesWithTasks.some((f) => f.isImage)
  const canRemoveFiles = pendingFilesWithTasks.every((f) =>
    f.tasks.every((t) => t.status === 'pending')
  )

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
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Compression presets
                  </Label>
                  <div className="space-y-1.5">
                    {(Object.keys(PRESET_LABELS) as CompressionPreset[]).map((preset) => (
                      <div key={preset} className="flex items-center gap-2">
                        <Checkbox
                          id={`preset-${preset}`}
                          checked={selectedPresets.includes(preset)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedPresets([...selectedPresets, preset])
                            } else {
                              setSelectedPresets(selectedPresets.filter((p) => p !== preset))
                            }
                          }}
                          disabled={isUploading}
                        />
                        <Label
                          htmlFor={`preset-${preset}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {PRESET_LABELS[preset]}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-2">
                    <Label htmlFor="keep-original" className="text-sm font-normal cursor-pointer">
                      Keep original
                    </Label>
                    <Switch
                      id="keep-original"
                      checked={keepOriginal}
                      onCheckedChange={setKeepOriginal}
                      disabled={isUploading}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {pendingFilesWithTasks.length > 0 && (
            <div className="max-h-60 space-y-2 overflow-auto">
              {pendingFilesWithTasks.map((pendingFile, index) => {
                const isProcessing = pendingFile.tasks.some(
                  (t) => t.status === 'compressing' || t.status === 'uploading'
                )
                const allPending = pendingFile.tasks.every((t) => t.status === 'pending')

                return (
                  <div
                    key={index}
                    className="rounded-md border border-border p-2"
                  >
                    <div className="flex items-start gap-3">
                      {pendingFile.isImage ? (
                        <IconPhoto size={20} className="mt-0.5 shrink-0 text-blue-500" />
                      ) : (
                        <IconFile size={20} className="mt-0.5 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="break-all text-sm font-medium">{pendingFile.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(pendingFile.file.size)}
                        </p>
                        {/* Task status list */}
                        {pendingFile.tasks.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {pendingFile.tasks.map((task, taskIndex) => (
                              <div key={taskIndex} className="flex items-center gap-1.5 text-xs">
                                {task.status === 'compressing' || task.status === 'uploading' ? (
                                  <IconLoader2 size={12} className="animate-spin text-muted-foreground" />
                                ) : task.status === 'success' ? (
                                  <span className="text-green-600">✓</span>
                                ) : task.status === 'error' ? (
                                  <span className="text-destructive">✗</span>
                                ) : (
                                  <span className="text-muted-foreground">○</span>
                                )}
                                <span className={task.status === 'error' ? 'text-destructive' : 'text-muted-foreground'}>
                                  {task.preset === 'original' ? 'Original' : PRESET_LABELS[task.preset]}
                                  {task.compressedSize && task.compressedSize < pendingFile.file.size && (
                                    <span className="text-green-600">
                                      {' → '}{formatFileSize(task.compressedSize)}
                                      {' ('}{Math.round((1 - task.compressedSize / pendingFile.file.size) * 100)}% smaller)
                                    </span>
                                  )}
                                  {task.status === 'compressing' && ' Compressing...'}
                                  {task.status === 'uploading' && ' Uploading...'}
                                  {task.status === 'error' && ` - ${task.error}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {isProcessing ? (
                        <IconLoader2 size={16} className="mt-0.5 animate-spin text-muted-foreground" />
                      ) : allPending && canRemoveFiles ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleRemoveFile(index)}
                        >
                          <IconX size={16} />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={pendingTaskCount === 0 || isUploading || (compressImages && selectedPresets.length === 0 && !keepOriginal)}
          >
            {isUploading ? (
              <>
                <IconLoader2 size={16} className="mr-2 animate-spin" />
                Uploading ({successTaskCount}/{totalTasks})
              </>
            ) : (
              <>
                <IconUpload size={16} className="mr-2" />
                Upload {pendingFilesWithTasks.length} {pendingFilesWithTasks.length === 1 ? 'file' : 'files'}
                {totalTasks > pendingFilesWithTasks.length && ` (${totalTasks} tasks)`}
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
