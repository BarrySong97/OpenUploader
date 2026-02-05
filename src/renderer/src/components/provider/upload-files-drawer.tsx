import { useState, useEffect, useMemo, useRef } from 'react'
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
import { Slider } from '@/components/ui/slider'
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
import { FolderPickerDialog } from '@/components/provider/folder-picker-dialog'
import { useUploadStore } from '@renderer/stores/upload-store'
import { useGlobalUploadStore } from '@renderer/stores/global-upload-store'
import { cn, formatFileSize } from '@/lib/utils'
import { useUploadSettingsStore } from '@renderer/stores/upload-settings-store'
import { useToast } from '@/components/ui/use-toast'
import { replaceMarkdownImageSources } from '@/lib/markdown-image'

interface UploadFilesDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  files: File[]
  provider?: TRPCProvider
  bucket?: string
  prefix?: string
  lockTarget?: boolean
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

function normalizePrefix(value?: string): string {
  if (!value) return ''
  const trimmed = value.replace(/^\/+/, '')
  if (!trimmed) return ''
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`
}

function formatPrefixLabel(prefix?: string): string {
  const normalized = normalizePrefix(prefix)
  return normalized ? `/${normalized.replace(/\/$/, '')}` : '/ (root)'
}

function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}

function createUploadFileItem(file: File): UploadFileItem {
  const isImage = isImageFile(file)
  return {
    file,
    previewUrl: isImage ? URL.createObjectURL(file) : '',
    selectedPreset: null,
    croppedContent: null,
    needsCrop: false,
    isImage
  }
}

export function UploadFilesDrawer({
  open,
  onOpenChange,
  files,
  provider,
  bucket,
  prefix,
  lockTarget,
  onUploadStart,
  onUploadComplete
}: UploadFilesDrawerProps) {
  const [fileItems, setFileItems] = useState<UploadFileItem[]>([])
  const [keepOriginal, setKeepOriginal] = useState(false)
  const [generateBlurHash, setGenerateBlurHash] = useState(false)
  const [autoGenerateMarkdown, setAutoGenerateMarkdown] = useState(false)
  const [markdownUrlMode, setMarkdownUrlMode] = useState<'with-endpoint' | 'without-endpoint'>(
    'with-endpoint'
  )
  const [isUploading, setIsUploading] = useState(false)
  const [cropperOpen, setCropperOpen] = useState(false)
  const [currentCropIndex, setCurrentCropIndex] = useState<number | null>(null)
  const [maxConcurrent, setLocalMaxConcurrent] = useState(5) // Default 5 concurrent uploads
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null)
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null)
  const [selectedPrefix, setSelectedPrefix] = useState('')
  const [folderPickerOpen, setFolderPickerOpen] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  // Track if we're restoring from saved settings to prevent reset effects
  const isRestoringFromSettings = useRef(false)

  const defaultGenerateBlurhash = useUploadSettingsStore((state) => state.defaultGenerateBlurhash)
  const rememberLastUploadTarget = useUploadSettingsStore((state) => state.rememberLastUploadTarget)
  const lastUploadTarget = useUploadSettingsStore((state) => state.lastUploadTarget)
  const setLastUploadTarget = useUploadSettingsStore((state) => state.setLastUploadTarget)

  const isTargetLocked = lockTarget ?? Boolean(provider && bucket)
  const normalizedContextPrefix = useMemo(() => normalizePrefix(prefix), [prefix])

  const { data: presets, isLoading: presetsLoading } = trpc.preset.list.useQuery()
  const { data: providers, isLoading: providersLoading } = trpc.provider.list.useQuery(undefined, {
    enabled: open && !isTargetLocked
  })
  const selectedProvider = useMemo(
    () => providers?.find((item) => item.id === selectedProviderId) ?? null,
    [providers, selectedProviderId]
  )
  const { data: buckets, isLoading: bucketsLoading } = trpc.provider.listBuckets.useQuery(
    { provider: selectedProvider as TRPCProvider },
    {
      enabled: open && !isTargetLocked && Boolean(selectedProvider)
    }
  )
  const uploadMutation = trpc.provider.uploadFile.useMutation()
  const compressMutation = trpc.image.compress.useMutation()
  const blurHashMutation = trpc.image.generateBlurHash.useMutation()
  const createRecordMutation = trpc.uploadHistory.createRecord.useMutation()
  const updateStatusMutation = trpc.uploadHistory.updateStatus.useMutation()
  const trpcUtils = trpc.useUtils()

  const {
    addTask,
    updateTask,
    setDrawerOpen: setUploadDrawerOpen,
    setMaxConcurrent,
    maxConcurrent: storeConcurrent
  } = useUploadStore()

  // Initialize file items when files change
  useEffect(() => {
    if (!open || files.length === 0) return

    setFileItems((prev) => {
      const existingKeys = new Set(prev.map((item) => fileKey(item.file)))
      const nextItems = files
        .filter((file) => !existingKeys.has(fileKey(file)))
        .map(createUploadFileItem)
      return nextItems.length > 0 ? [...prev, ...nextItems] : prev
    })
  }, [open, files])

  useEffect(() => {
    if (open) return
    setFileItems((prev) => {
      prev.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl)
        }
      })
      return []
    })
  }, [open])

  // Reset state when drawer opens
  useEffect(() => {
    if (open) {
      setKeepOriginal(false)
      // Initialize generateBlurHash from settings
      setGenerateBlurHash(defaultGenerateBlurhash)
      setIsUploading(false)
      setLocalMaxConcurrent(storeConcurrent) // Initialize from store
    }
  }, [open, storeConcurrent, defaultGenerateBlurhash])

  useEffect(() => {
    if (!open) return
    if (isTargetLocked) {
      setSelectedProviderId(provider?.id ?? null)
      setSelectedBucket(bucket ?? null)
      setSelectedPrefix(normalizedContextPrefix)
      isRestoringFromSettings.current = false
      return
    }
    // When not locked, try to restore from saved settings
    if (rememberLastUploadTarget && lastUploadTarget) {
      isRestoringFromSettings.current = true
      setSelectedProviderId(lastUploadTarget.providerId)
      setSelectedBucket(lastUploadTarget.bucket)
      setSelectedPrefix(lastUploadTarget.prefix)
      // Reset the flag after a tick to allow the state to settle
      setTimeout(() => {
        isRestoringFromSettings.current = false
      }, 0)
    } else {
      isRestoringFromSettings.current = false
      setSelectedProviderId(null)
      setSelectedBucket(null)
      setSelectedPrefix('')
    }
  }, [
    open,
    isTargetLocked,
    provider?.id,
    bucket,
    normalizedContextPrefix,
    rememberLastUploadTarget,
    lastUploadTarget
  ])

  useEffect(() => {
    if (!open || isTargetLocked || isRestoringFromSettings.current) return
    setSelectedBucket(null)
    setSelectedPrefix('')
  }, [selectedProviderId, open, isTargetLocked])

  useEffect(() => {
    if (!open || isTargetLocked || isRestoringFromSettings.current) return
    setSelectedPrefix('')
  }, [selectedBucket, open, isTargetLocked])

  useEffect(() => {
    if (!open) {
      setFolderPickerOpen(false)
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

  const appendFiles = (incoming: File[]) => {
    if (incoming.length === 0) return
    setFileItems((prev) => {
      const existingKeys = new Set(prev.map((item) => fileKey(item.file)))
      const nextItems = incoming
        .filter((file) => !existingKeys.has(fileKey(file)))
        .map(createUploadFileItem)
      return nextItems.length > 0 ? [...prev, ...nextItems] : prev
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

  const imageCount = useMemo(() => fileItems.filter((item) => item.isImage).length, [fileItems])

  const presetCount = useMemo(
    () => fileItems.filter((item) => item.isImage && item.selectedPreset !== null).length,
    [fileItems]
  )

  const targetProvider = isTargetLocked ? (provider ?? null) : selectedProvider
  const targetBucket = isTargetLocked ? (bucket ?? null) : selectedBucket
  const targetPrefix = isTargetLocked ? normalizedContextPrefix : selectedPrefix
  const canBrowseFolders = Boolean(selectedProvider && selectedBucket)

  const resolveUploadTarget = () => {
    if (!targetProvider || !targetBucket) return null
    return {
      provider: targetProvider,
      bucket: targetBucket,
      prefix: targetPrefix ? normalizePrefix(targetPrefix) : undefined
    }
  }

  // Concurrency limiter helper - limits concurrent async operations
  const createConcurrencyLimiter = (limit: number) => {
    let running = 0
    const queue: Array<() => Promise<void>> = []

    const run = async (fn: () => Promise<void>) => {
      while (running >= limit && queue.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 10))
      }

      running++
      try {
        await fn()
      } finally {
        running--
      }
    }

    return { run }
  }

  // Process a single file item (handles all its uploads: compression, original, blurhash)
  const processFileItem = async (
    item: UploadFileItem,
    target: { provider: TRPCProvider; bucket: string; prefix?: string }
  ) => {
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
        providerId: target.provider.id,
        bucket: target.bucket,
        prefix: target.prefix,
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
          const preset = presets?.find((p) => p.id === presetId)
          const presetName = preset?.name || presetId
          const filename = `${baseName}_${presetName}_${compressResult.width}x${compressResult.height}.${actualExt}`
          const key = target.prefix ? `${target.prefix}${filename}` : filename

          try {
            const dbRecord = await createRecordMutation.mutateAsync({
              providerId: target.provider.id,
              bucket: target.bucket,
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
            bucket: target.bucket,
            key,
            prefix: target.prefix,
            filename,
            preset: presetId
          })

          const result = await uploadMutation.mutateAsync({
            provider: target.provider,
            bucket: target.bucket,
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
      const key = target.prefix ? `${target.prefix}${filename}` : filename

      // Create DB record first with 'uploading' status
      let dbRecordId: string | undefined
      try {
        const dbRecord = await createRecordMutation.mutateAsync({
          providerId: target.provider.id,
          bucket: target.bucket,
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
        providerId: target.provider.id,
        bucket: target.bucket,
        prefix: target.prefix,
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
          bucket: target.bucket,
          key,
          prefix: target.prefix,
          filename
        })

        const result = await uploadMutation.mutateAsync({
          provider: target.provider,
          bucket: target.bucket,
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
      const key = target.prefix ? `${target.prefix}${filename}` : filename

      // Create DB record first with 'uploading' status
      let dbRecordId: string | undefined
      try {
        const dbRecord = await createRecordMutation.mutateAsync({
          providerId: target.provider.id,
          bucket: target.bucket,
          key,
          name: filename,
          type: 'file',
          size: undefined, // Size will be updated after upload
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
        providerId: target.provider.id,
        bucket: target.bucket,
        prefix: target.prefix,
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
          bucket: target.bucket,
          key,
          prefix: target.prefix,
          filename
        })

        const result = await uploadMutation.mutateAsync({
          provider: target.provider,
          bucket: target.bucket,
          key,
          content: blurResult.content,
          contentType: 'image/webp'
        })

        if (result.success) {
          // Calculate actual blurhash file size from base64 content
          const actualFileSize = Math.ceil(blurResult.content.length * 0.75) // Convert base64 to actual bytes

          updateTask(taskId, {
            status: 'completed',
            progress: 100,
            outputKey: key,
            compressedSize: actualFileSize
          })
          // Update DB record status to completed with actual file size
          if (dbRecordId) {
            await updateStatusMutation.mutateAsync({
              id: dbRecordId,
              status: 'completed',
              size: actualFileSize
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

  const processUploads = async (
    target: {
      provider: TRPCProvider
      bucket: string
      prefix?: string
    },
    options?: {
      autoGenerateMarkdown?: boolean
      markdownUrlMode?: 'with-endpoint' | 'without-endpoint'
      markdownData?: typeof markdownData
    }
  ) => {
    // Update store with the selected concurrency level
    setMaxConcurrent(maxConcurrent)

    // Create a limiter for concurrent file processing
    const limiter = createConcurrencyLimiter(maxConcurrent)

    // Create promise for each file item
    const uploadPromises = fileItems.map((item) => limiter.run(() => processFileItem(item, target)))

    // Wait for all uploads to complete (with error handling)
    await Promise.allSettled(uploadPromises)

    // Save last upload target if setting is enabled
    if (rememberLastUploadTarget) {
      setLastUploadTarget({
        providerId: target.provider.id,
        bucket: target.bucket,
        prefix: target.prefix ?? ''
      })
    }

    // Invalidate queries to refresh data
    trpcUtils.provider.listObjects.invalidate()
    trpcUtils.uploadHistory.list.invalidate()

    // Auto generate markdown if enabled
    if (options?.autoGenerateMarkdown && options.markdownData) {
      const withEndpoint = options.markdownUrlMode === 'with-endpoint'
      await generateMarkdown(withEndpoint, options.markdownData)
    }

    // Call onUploadComplete after all uploads are done
    onUploadComplete?.()
  }
  const handleStartUpload = () => {
    const target = resolveUploadTarget()
    if (!target || fileItems.length === 0) return

    // Capture current state before closing drawer (markdownData will be cleared when drawer closes)
    const shouldAutoGenerateMarkdown = autoGenerateMarkdown && hasMarkdownData
    const currentMarkdownUrlMode = markdownUrlMode
    const capturedMarkdownData = [...markdownData] // Clone to preserve data

    // Close drawer immediately
    onOpenChange(false)
    onUploadStart()

    // Open the upload manager drawer to show progress
    setUploadDrawerOpen(true)

    // Run uploads in background (non-blocking)
    processUploads(target, {
      autoGenerateMarkdown: shouldAutoGenerateMarkdown,
      markdownUrlMode: currentMarkdownUrlMode,
      markdownData: capturedMarkdownData
    })
  }

  const { toast } = useToast()
  const markdownData = useGlobalUploadStore((state) => state.markdownData)

  const generateMarkdown = async (
    withEndpoint: boolean,
    markdownDataOverride?: typeof markdownData
  ) => {
    const dataToUse = markdownDataOverride ?? markdownData
    if (dataToUse.length === 0) {
      toast({
        title: 'No markdown data',
        description: 'No markdown files were uploaded.',
        variant: 'destructive'
      })
      return
    }

    try {
      const markdownOutputs: string[] = []

      // Build a lookup from file name to output key from completed upload tasks
      // Exclude blurhash tasks - we want the preset-compressed or original uploads
      const uploadStore = useUploadStore.getState()
      const fileNameToTask = new Map<string, (typeof uploadStore.tasks)[0]>()
      for (const task of uploadStore.tasks) {
        if (
          task.status === 'completed' &&
          task.outputKey &&
          task.compressionPreset !== 'blurhash' // Exclude blurhash tasks
        ) {
          fileNameToTask.set(task.file.name, task)
        }
      }

      console.log('[GenerateMarkdown] markdownData:', dataToUse.length, 'files')
      console.log('[GenerateMarkdown] completed tasks (excluding blurhash):', fileNameToTask.size)

      for (const md of dataToUse) {
        const replacements = new Map<string, string>()

        console.log('[GenerateMarkdown] Processing:', md.fileName)
        console.log(
          '[GenerateMarkdown] imageSourceToFileName entries:',
          md.imageSourceToFileName.size
        )

        // Iterate through the imageSourceToFileName mapping
        for (const [originalSource, fileName] of md.imageSourceToFileName.entries()) {
          console.log('[GenerateMarkdown] Looking for:', fileName, 'from source:', originalSource)
          const task = fileNameToTask.get(fileName)
          if (!task || !task.outputKey) {
            console.log('[GenerateMarkdown] No matching task for:', fileName)
            // Skip if no matching completed task
            continue
          }

          console.log('[GenerateMarkdown] Found task with outputKey:', task.outputKey)

          if (withEndpoint) {
            // Get full URL with endpoint
            try {
              // Find the provider object from the providers list
              const provider = providers?.find((p) => p.id === task.providerId)
              if (provider) {
                const result = await trpcUtils.provider.getPlainObjectUrl.fetch({
                  provider,
                  bucket: task.bucket,
                  key: task.outputKey
                })
                replacements.set(originalSource, result.url)
              } else {
                // Fallback to key-only path
                replacements.set(originalSource, `/${task.outputKey}`)
              }
            } catch {
              // Fallback to key-only path
              replacements.set(originalSource, `/${task.outputKey}`)
            }
          } else {
            // Use key-only path with leading slash
            replacements.set(originalSource, `/${task.outputKey}`)
          }
        }

        // Replace image sources in markdown content
        console.log('[GenerateMarkdown] Replacements:', replacements.size)
        const updatedContent = replaceMarkdownImageSources(md.content, replacements)
        markdownOutputs.push(updatedContent)
      }

      // Combine all markdown outputs
      const combinedMarkdown = markdownOutputs.join('\n\n---\n\n')

      // Generate default file name
      const defaultName =
        dataToUse.length === 1 ? dataToUse[0].fileName : `combined_${dataToUse.length}_files.md`

      // Show save dialog
      const result = await window.api.saveFile({
        defaultName,
        content: combinedMarkdown,
        filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }]
      })

      if (result.canceled) {
        return
      }

      if (result.success) {
        toast({
          title: 'Markdown saved',
          description: `Saved to ${result.filePath}`
        })
      } else {
        toast({
          title: 'Failed to save markdown',
          description: 'Unknown error',
          variant: 'destructive'
        })
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      toast({
        title: 'Failed to generate markdown',
        description: errorMsg,
        variant: 'destructive'
      })
    }
  }

  const canUpload = fileItems.length > 0 && !isUploading && Boolean(targetProvider && targetBucket)
  const hasMarkdownData = markdownData.length > 0

  const handleDrawerDragOver = (event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes('Files')) return
    event.preventDefault()
    event.stopPropagation()
    setIsDragOver(true)
  }

  const handleDrawerDragLeave = (event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes('Files')) return
    event.preventDefault()
    event.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrawerDrop = (event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes('Files')) return
    event.preventDefault()
    event.stopPropagation()
    setIsDragOver(false)
    appendFiles(Array.from(event.dataTransfer.files))
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className={cn(
            'p-0 flex min-h-0 flex-col !h-[85vh] rounded-t-md transition-colors',
            isDragOver && 'ring-2 ring-primary/40'
          )}
          onDragOver={handleDrawerDragOver}
          onDragLeave={handleDrawerDragLeave}
          onDrop={handleDrawerDrop}
        >
          <SheetHeader className="p-4 pb-2">
            <SheetTitle className="flex items-center gap-2">
              <IconUpload size={20} className="text-blue-500" />
              Upload Files
            </SheetTitle>
            <SheetDescription>
              {fileItems.length} file{fileItems.length !== 1 && 's'} selected
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="min-h-0 flex-1 px-4">
            <div className="space-y-4 pb-4">
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Upload destination</Label>
                  {isTargetLocked && (
                    <span className="text-xs text-muted-foreground">
                      Auto-filled from current bucket
                    </span>
                  )}
                </div>
                {isTargetLocked ? (
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Provider</span>
                      <span className="font-medium">{provider?.name || 'Loading provider...'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Bucket</span>
                      <span className="font-medium">{bucket || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Folder</span>
                      <span className="font-medium">{formatPrefixLabel(targetPrefix)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Provider</Label>
                        <Select
                          value={selectedProviderId || undefined}
                          onValueChange={(value) => setSelectedProviderId(value)}
                          disabled={providersLoading}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                providersLoading ? 'Loading providers...' : 'Select provider'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {providers?.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Bucket</Label>
                        <Select
                          value={selectedBucket || undefined}
                          onValueChange={(value) => setSelectedBucket(value)}
                          disabled={!selectedProvider || bucketsLoading}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                !selectedProvider
                                  ? 'Select provider first'
                                  : bucketsLoading
                                    ? 'Loading buckets...'
                                    : 'Select bucket'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {buckets?.map((item) => (
                              <SelectItem key={item.name} value={item.name}>
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Folder</Label>
                        <div className="text-sm font-medium">
                          {formatPrefixLabel(selectedPrefix)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedPrefix && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedPrefix('')}
                            disabled={!canBrowseFolders}
                          >
                            Root
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFolderPickerOpen(true)}
                          disabled={!canBrowseFolders}
                        >
                          Browse
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
                        <SelectValue
                          placeholder={imageCount === 0 ? 'No images' : 'Select preset'}
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
                            <TableCell className="font-medium break-all">
                              {item.file.name}
                            </TableCell>
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
                {hasMarkdownData && (
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Label
                        htmlFor="auto-generate-markdown"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Generate Markdown
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Replace image URLs after upload completes
                      </p>
                      {autoGenerateMarkdown && (
                        <Select
                          value={markdownUrlMode}
                          onValueChange={(v) =>
                            setMarkdownUrlMode(v as 'with-endpoint' | 'without-endpoint')
                          }
                        >
                          <SelectTrigger className="h-7 w-40 mt-2 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="with-endpoint">With Endpoint</SelectItem>
                            <SelectItem value="without-endpoint">Without Endpoint</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <Switch
                      id="auto-generate-markdown"
                      checked={autoGenerateMarkdown}
                      onCheckedChange={setAutoGenerateMarkdown}
                      disabled={isUploading}
                    />
                  </div>
                )}
                <div className="space-y-2 border-t pt-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="max-concurrent" className="text-sm font-normal">
                      Concurrent Uploads
                    </Label>
                    <span className="text-sm font-semibold text-blue-500">{maxConcurrent}</span>
                  </div>
                  <Slider
                    id="max-concurrent"
                    min={1}
                    max={20}
                    step={1}
                    value={[maxConcurrent]}
                    onValueChange={(value) => setLocalMaxConcurrent(value[0])}
                    disabled={isUploading}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    {maxConcurrent === 1
                      ? 'Sequential uploads'
                      : `${maxConcurrent} files will upload simultaneously`}
                  </p>
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <p className="text-muted-foreground">
                  Total uploads:{' '}
                  <span className="font-medium text-foreground">{totalTasks} files</span>
                  {maxConcurrent > 1 && (
                    <span className="ml-2 text-blue-500 font-medium">
                      ({maxConcurrent} concurrent)
                    </span>
                  )}
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

      {selectedProvider && selectedBucket && (
        <FolderPickerDialog
          open={folderPickerOpen}
          onOpenChange={setFolderPickerOpen}
          provider={selectedProvider}
          bucket={selectedBucket}
          initialPrefix={selectedPrefix}
          onConfirm={(nextPrefix) => setSelectedPrefix(nextPrefix)}
        />
      )}

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
