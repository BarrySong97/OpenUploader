import { useState, useEffect, useMemo } from 'react'
import {
  IconUpload,
  IconLoader2,
  IconScissors,
  IconCheck,
  IconTrash,
  IconFile
} from '@tabler/icons-react'
import { trpc, type TRPCProvider } from '@renderer/lib/trpc'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { ImageCropper } from '@/components/ui/image-cropper'
import { useUploadStore } from '@renderer/stores/upload-store'
import { formatFileSize } from '@/lib/utils'

interface UploadFilesDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  files: File[]
  provider: TRPCProvider
  bucket: string
  prefix?: string
  onUploadStart: () => void
  onUploadComplete?: () => void
}

interface UploadFileItem {
  file: File
  previewUrl: string
  selectedPreset: string | null
  croppedContent: string | null
  needsCrop: boolean
  isImage: boolean
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function isImageFile(file: File): boolean {
  return (
    file.type.startsWith('image/') &&
    ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'].includes(
      file.type.toLowerCase()
    )
  )
}

export function UploadFilesDrawer({
  open,
  onOpenChange,
  files,
  provider,
  bucket,
  prefix,
  onUploadStart,
  onUploadComplete
}: UploadFilesDrawerProps) {
  const [fileItems, setFileItems] = useState<UploadFileItem[]>([])
  const [keepOriginal, setKeepOriginal] = useState(false)
  const [generateBlurHash, setGenerateBlurHash] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [cropperOpen, setCropperOpen] = useState(false)
  const [currentCropIndex, setCurrentCropIndex] = useState<number | null>(null)

  const { data: presets, isLoading: presetsLoading } = trpc.preset.list.useQuery()
  const uploadMutation = trpc.provider.uploadFile.useMutation()
  const compressMutation = trpc.image.compress.useMutation()
  const blurHashMutation = trpc.image.generateBlurHash.useMutation()
  const createRecordMutation = trpc.uploadHistory.createRecord.useMutation()
  const updateStatusMutation = trpc.uploadHistory.updateStatus.useMutation()
  const trpcUtils = trpc.useUtils()

  const { addTask, updateTask, setDrawerOpen: setUploadDrawerOpen } = useUploadStore()

  // Initialize file items when files change
  useEffect(() => {
    if (!open || files.length === 0) {
      setFileItems([])
      return
    }

    const newItems: UploadFileItem[] = files.map((file) => {
      const isImage = isImageFile(file)
      return {
        file,
        previewUrl: isImage ? URL.createObjectURL(file) : '',
        selectedPreset: null,
        croppedContent: null,
        needsCrop: false,
        isImage
      }
    })
    setFileItems(newItems)

    return () => {
      newItems.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl)
        }
      })
    }
  }, [open, files])

  // Reset state when drawer opens
  useEffect(() => {
    if (open) {
      setKeepOriginal(false)
      setGenerateBlurHash(false)
      setIsUploading(false)
    }
  }, [open])

  // Update needsCrop when preset changes
  const updatePreset = (index: number, presetId: string) => {
    const preset = presets?.find((p) => p.id === presetId)
    setFileItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? item.isImage
          ? {
              ...item,
              selectedPreset: presetId,
              needsCrop: !!preset?.aspectRatio,
              croppedContent: preset?.aspectRatio ? item.croppedContent : null
            }
          : item
          : item
      )
    )
  }

  const applyPresetToAll = (presetId: string) => {
    const preset = presets?.find((p) => p.id === presetId)
    setFileItems((prev) =>
      prev.map((item) =>
        item.isImage
          ? {
              ...item,
              selectedPreset: presetId,
              needsCrop: !!preset?.aspectRatio,
              croppedContent: preset?.aspectRatio ? item.croppedContent : null
            }
          : item
      )
    )
  }

  const removeImage = (index: number) => {
    setFileItems((prev) => {
      const newItems = [...prev]
      if (newItems[index].previewUrl) {
        URL.revokeObjectURL(newItems[index].previewUrl)
      }
      newItems.splice(index, 1)
      return newItems
    })
  }

  const openCropper = (index: number) => {
    setCurrentCropIndex(index)
    setCropperOpen(true)
  }

  const handleCropComplete = (croppedImageData: string) => {
    if (currentCropIndex !== null) {
      // Extract base64 content (remove data:image/png;base64, prefix)
      const base64Content = croppedImageData.split(',')[1]
      setFileItems((prev) =>
        prev.map((item, i) =>
          i === currentCropIndex ? { ...item, croppedContent: base64Content } : item
        )
      )
    }
    setCropperOpen(false)
    setCurrentCropIndex(null)
  }

  const currentCropItem = currentCropIndex !== null ? fileItems[currentCropIndex] : null
  const currentPreset =
    currentCropItem && presets?.find((p) => p.id === currentCropItem.selectedPreset)

  const totalTasks = useMemo(() => {
    const imageItems = fileItems.filter((item) => item.isImage)
    const compressedCount = imageItems.filter((item) => item.selectedPreset !== null).length
    let count = fileItems.length
    if (keepOriginal) count += compressedCount
    if (generateBlurHash) count += imageItems.length
    return count
  }, [fileItems, keepOriginal, generateBlurHash])

  const imageCount = useMemo(
    () => fileItems.filter((item) => item.isImage).length,
    [fileItems]
  )

  const presetCount = useMemo(
    () => fileItems.filter((item) => item.isImage && item.selectedPreset !== null).length,
    [fileItems]
  )

  const processUploads = async () => {
    // Process each image item
    for (const item of fileItems) {
      const file = item.file
      const originalContent = await fileToBase64(file)
      const originalFilename = file.name
      const originalContentType = file.type
      const isImage = item.isImage
      const shouldCompress = isImage && item.selectedPreset !== null

      // Get original image info
      let originalWidth: number | undefined
      let originalHeight: number | undefined
      if (isImage) {
        try {
          const imageInfo = await trpcUtils.image.getInfo.fetch({ content: originalContent })
          originalWidth = imageInfo.width
          originalHeight = imageInfo.height
        } catch {
          // Ignore
        }
      }

      // Upload with selected preset if exists
      if (shouldCompress) {
        const presetId = item.selectedPreset as string
        const baseName =
          originalFilename.substring(0, originalFilename.lastIndexOf('.')) || originalFilename

        let dbRecordId: string | undefined

        const taskId = addTask({
          file,
          fileName: file.name,
          fileSize: file.size,
          providerId: provider.id,
          bucket,
          prefix,
          status: 'compressing',
          progress: 0,
          compressionEnabled: true,
          compressionPreset: presetId,
          originalSize: file.size,
          isImage,
          dbRecordId
        })

        try {
          // Use cropped content if available, otherwise use original
          const contentToCompress = item.croppedContent || originalContent

          // Compress the image
          const compressResult = await compressMutation.mutateAsync({
            content: contentToCompress,
            preset: presetId,
            filename: originalFilename
          })

          if (compressResult.success && compressResult.content) {
            const actualExt =
              compressResult.format === 'jpeg' ? 'jpg' : compressResult.format || 'webp'
            const filename = `${baseName}_${presetId}_${compressResult.width}x${compressResult.height}.${actualExt}`
            const key = prefix ? `${prefix}${filename}` : filename

            try {
              const dbRecord = await createRecordMutation.mutateAsync({
                providerId: provider.id,
                bucket,
                key,
                name: filename,
                type: 'file',
                size: compressResult.compressedSize ?? file.size,
                mimeType: `image/${compressResult.format || actualExt}`,
                uploadSource: 'app',
                isCompressed: true,
                originalSize: file.size,
                compressionPresetId: presetId,
                status: 'uploading'
              })
              dbRecordId = dbRecord.id
              updateTask(taskId, { dbRecordId })
            } catch (error) {
              console.error('[ImageUpload] Failed to create DB record:', error)
            }

            updateTask(taskId, {
              status: 'uploading',
              compressedSize: compressResult.compressedSize,
              width: compressResult.width,
              height: compressResult.height,
              format: compressResult.format
            })

            console.log('[ImageUpload] Uploading compressed image:', {
              bucket,
              key,
              prefix,
              filename,
              preset: presetId
            })

            const result = await uploadMutation.mutateAsync({
              provider,
              bucket,
              key,
              content: compressResult.content,
              contentType: `image/${compressResult.format}`
            })

            if (result.success) {
              updateTask(taskId, {
                status: 'completed',
                progress: 100,
                outputKey: key
              })
              // Update DB record status to completed
              if (dbRecordId) {
                await updateStatusMutation.mutateAsync({
                  id: dbRecordId,
                  status: 'completed'
                })
              }
            } else {
              const errorMsg = result.error || 'Upload failed'
              updateTask(taskId, {
                status: 'error',
                error: errorMsg
              })
              // Update DB record status to error
              if (dbRecordId) {
                await updateStatusMutation.mutateAsync({
                  id: dbRecordId,
                  status: 'error',
                  errorMessage: errorMsg
                })
              }
            }
          } else {
            const errorMsg = compressResult.error || 'Compression failed'
            updateTask(taskId, {
              status: 'error',
              error: errorMsg
            })
            // Update DB record status to error
            if (dbRecordId) {
              await updateStatusMutation.mutateAsync({
                id: dbRecordId,
                status: 'error',
                errorMessage: errorMsg
              })
            }
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          updateTask(taskId, {
            status: 'error',
            error: errorMsg
          })
          // Update DB record status to error
          if (dbRecordId) {
            await updateStatusMutation.mutateAsync({
              id: dbRecordId,
              status: 'error',
              errorMessage: errorMsg
            })
          }
        }
      }

      const shouldUploadOriginal = !shouldCompress || (keepOriginal && shouldCompress)

      // Upload original if no preset is selected, or if keepOriginal is enabled
      if (shouldUploadOriginal) {
        const baseName =
          originalFilename.substring(0, originalFilename.lastIndexOf('.')) || originalFilename
        const ext = originalFilename.substring(originalFilename.lastIndexOf('.') + 1)
        const hasDimensions = typeof originalWidth === 'number' && typeof originalHeight === 'number'
        const filename =
          shouldCompress && isImage
            ? `${baseName}_original${hasDimensions ? `_${originalWidth}x${originalHeight}` : ''}.${ext}`
            : originalFilename
        const key = prefix ? `${prefix}${filename}` : filename

        // Create DB record first with 'uploading' status
        let dbRecordId: string | undefined
        try {
          const dbRecord = await createRecordMutation.mutateAsync({
            providerId: provider.id,
            bucket,
            key,
            name: filename,
            type: 'file',
            size: file.size,
            mimeType: originalContentType,
            uploadSource: 'app',
            isCompressed: false,
            originalSize: file.size,
            status: 'uploading'
          })
          dbRecordId = dbRecord.id
        } catch (error) {
          console.error('[ImageUpload] Failed to create DB record:', error)
        }

        const taskId = addTask({
          file,
          fileName: file.name,
          fileSize: file.size,
          providerId: provider.id,
          bucket,
          prefix,
          status: 'uploading',
          progress: 0,
          compressionEnabled: false,
          compressionPreset: isImage ? 'original' : undefined,
          originalSize: file.size,
          isImage,
          dbRecordId
        })

        try {
          console.log('[ImageUpload] Uploading original file:', {
            bucket,
            key,
            prefix,
            filename
          })

          const result = await uploadMutation.mutateAsync({
            provider,
            bucket,
            key,
            content: originalContent,
            contentType: originalContentType
          })

          if (result.success) {
            updateTask(taskId, {
              status: 'completed',
              progress: 100,
              outputKey: key
            })
            // Update DB record status to completed
            if (dbRecordId) {
              await updateStatusMutation.mutateAsync({
                id: dbRecordId,
                status: 'completed'
              })
            }
          } else {
            const errorMsg = result.error || 'Upload failed'
            updateTask(taskId, {
              status: 'error',
              error: errorMsg
            })
            // Update DB record status to error
            if (dbRecordId) {
              await updateStatusMutation.mutateAsync({
                id: dbRecordId,
                status: 'error',
                errorMessage: errorMsg
              })
            }
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          updateTask(taskId, {
            status: 'error',
            error: errorMsg
          })
          // Update DB record status to error
          if (dbRecordId) {
            await updateStatusMutation.mutateAsync({
              id: dbRecordId,
              status: 'error',
              errorMessage: errorMsg
            })
          }
        }
      }

      // Generate and upload BlurHash if selected
      if (generateBlurHash && isImage) {
        const baseName =
          originalFilename.substring(0, originalFilename.lastIndexOf('.')) || originalFilename
        const filename = `${baseName}_blurhash.webp`
        const key = prefix ? `${prefix}${filename}` : filename

        // Create DB record first with 'uploading' status
        let dbRecordId: string | undefined
        try {
          const dbRecord = await createRecordMutation.mutateAsync({
            providerId: provider.id,
            bucket,
            key,
            name: filename,
            type: 'file',
            size: file.size,
            mimeType: 'image/webp',
            uploadSource: 'app',
            isCompressed: true,
            originalSize: file.size,
            compressionPresetId: 'blurhash',
            status: 'uploading'
          })
          dbRecordId = dbRecord.id
        } catch (error) {
          console.error('[ImageUpload] Failed to create DB record:', error)
        }

        const taskId = addTask({
          file,
          fileName: `${file.name} (blurhash)`,
          fileSize: file.size,
          providerId: provider.id,
          bucket,
          prefix,
          status: 'compressing',
          progress: 0,
          compressionEnabled: true,
          compressionPreset: 'blurhash',
          originalSize: file.size,
          isImage: true,
          dbRecordId
        })

        try {
          const blurResult = await blurHashMutation.mutateAsync({
            content: originalContent
          })

          updateTask(taskId, {
            status: 'uploading',
            compressedSize: Math.ceil(blurResult.content.length * 0.75), // Approximate base64 to bytes
            width: blurResult.width,
            height: blurResult.height
          })

          console.log('[ImageUpload] Uploading blurhash:', {
            bucket,
            key,
            prefix,
            filename
          })

          const result = await uploadMutation.mutateAsync({
            provider,
            bucket,
            key,
            content: blurResult.content,
            contentType: 'image/webp'
          })

          if (result.success) {
            updateTask(taskId, {
              status: 'completed',
              progress: 100,
              outputKey: key
            })
            // Update DB record status to completed
            if (dbRecordId) {
              await updateStatusMutation.mutateAsync({
                id: dbRecordId,
                status: 'completed'
              })
            }
          } else {
            const errorMsg = result.error || 'Upload failed'
            updateTask(taskId, {
              status: 'error',
              error: errorMsg
            })
            // Update DB record status to error
            if (dbRecordId) {
              await updateStatusMutation.mutateAsync({
                id: dbRecordId,
                status: 'error',
                errorMessage: errorMsg
              })
            }
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          updateTask(taskId, {
            status: 'error',
            error: errorMsg
          })
          // Update DB record status to error
          if (dbRecordId) {
            await updateStatusMutation.mutateAsync({
              id: dbRecordId,
              status: 'error',
              errorMessage: errorMsg
            })
          }
        }
      }
    }

    // Call onUploadComplete after all uploads are done
    onUploadComplete?.()
  }
  const handleStartUpload = () => {
    if (fileItems.length === 0) {
      return
    }

    // Close drawer immediately
    onOpenChange(false)
    onUploadStart()

    // Open the upload manager drawer to show progress
    setUploadDrawerOpen(true)

    // Run uploads in background (non-blocking)
    processUploads()
  }

  const canUpload = fileItems.length > 0 && !isUploading

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="p-0 flex flex-col !h-[85vh] rounded-t-md">
          <SheetHeader className="p-4 pb-2">
            <SheetTitle className="flex items-center gap-2">
              <IconUpload size={20} className="text-blue-500" />
              Upload Files
            </SheetTitle>
            <SheetDescription>
              {fileItems.length} file{fileItems.length !== 1 && 's'} selected
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 px-4">
            <div className="space-y-4 pb-4">
              {/* Image table */}
              {presetsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <>
                  {/* Apply to All section */}
                  <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3">
                    <Label className="text-sm font-medium">Apply preset to all images:</Label>
                    <Select onValueChange={applyPresetToAll} disabled={imageCount === 0}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder={imageCount === 0 ? 'No images' : 'Select preset'} />
                      </SelectTrigger>
                      <SelectContent>
                        {presets?.map((preset) => (
                          <SelectItem key={preset.id} value={preset.id}>
                            {preset.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Table */}
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-16">Preview</TableHead>
                          <TableHead>Filename</TableHead>
                          <TableHead className="w-24">Size</TableHead>
                          <TableHead className="w-48">Preset</TableHead>
                          <TableHead className="w-28">Crop</TableHead>
                          <TableHead className="w-16"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fileItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md border bg-muted">
                                {item.isImage ? (
                                  <img
                                    src={item.previewUrl}
                                    alt={item.file.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <IconFile size={18} className="text-muted-foreground" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{item.file.name}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatFileSize(item.file.size)}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={item.selectedPreset || undefined}
                                onValueChange={(value) => updatePreset(index, value)}
                                disabled={!item.isImage}
                              >
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={item.isImage ? 'Select preset' : 'Not applicable'}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {presets?.map((preset) => (
                                    <SelectItem key={preset.id} value={preset.id}>
                                      {preset.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              {item.isImage && item.needsCrop ? (
                                <Button
                                  variant={item.croppedContent ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => openCropper(index)}
                                  className={
                                    item.croppedContent
                                      ? 'bg-green-500 hover:bg-green-600'
                                      : 'border-orange-500 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950'
                                  }
                                >
                                  {item.croppedContent ? (
                                    <>
                                      <IconCheck size={14} className="mr-1" />
                                      Cropped
                                    </>
                                  ) : (
                                    <>
                                      <IconScissors size={14} className="mr-1" />
                                      Crop
                                    </>
                                  )}
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeImage(index)}
                                className="h-8 w-8 text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                              >
                                <IconTrash size={16} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}

              {/* Options */}
              <div className="space-y-3 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="keep-original" className="text-sm font-normal cursor-pointer">
                    Keep original image
                  </Label>
                  <Switch
                    id="keep-original"
                    checked={keepOriginal}
                    onCheckedChange={setKeepOriginal}
                    disabled={isUploading || imageCount === 0}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label
                      htmlFor="generate-blurhash"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Generate BlurHash
                    </Label>
                    <p className="text-xs text-muted-foreground">Small blurred placeholder image</p>
                    <p className="text-xs text-muted-foreground">
                      This file will also be uploaded.
                    </p>
                  </div>
                  <Switch
                    id="generate-blurhash"
                    checked={generateBlurHash}
                    onCheckedChange={setGenerateBlurHash}
                    disabled={isUploading || imageCount === 0}
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <p className="text-muted-foreground">
                  Total uploads:{' '}
                  <span className="font-medium text-foreground">{totalTasks} files</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {presetCount > 0 && `${presetCount} preset uploads`}
                  {keepOriginal && presetCount > 0 && ' + originals'}
                  {generateBlurHash && imageCount > 0 && ` + ${imageCount} blurhash`}
                </p>
              </div>
            </div>
          </ScrollArea>

          <SheetFooter className="p-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={handleStartUpload} disabled={!canUpload}>
              {isUploading ? (
                <>
                  <IconLoader2 size={16} className="mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <IconUpload size={16} className="mr-2" />
                  Start Upload
                </>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Image Cropper Dialog */}
      {currentCropItem && (
        <ImageCropper
          open={cropperOpen}
          onOpenChange={setCropperOpen}
          imageSrc={currentCropItem.previewUrl}
          aspectRatio={currentPreset?.aspectRatio as any}
          onCropComplete={handleCropComplete}
          title="Crop Image"
          description={`Crop ${currentCropItem.file.name} to ${currentPreset?.aspectRatio || 'free'} aspect ratio`}
        />
      )}
    </>
  )
}
