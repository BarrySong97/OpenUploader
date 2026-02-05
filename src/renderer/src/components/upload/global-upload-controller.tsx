import { useEffect, useMemo, useRef, useState } from 'react'
import { IconCloudUpload, IconFileText, IconLoader2 } from '@tabler/icons-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { UploadFilesDrawer } from '@/components/provider/upload-files-drawer'
import { useGlobalUploadStore } from '@renderer/stores/global-upload-store'
import { useNavigationStore } from '@renderer/stores/navigation-store'
import { extractMarkdownDataFromFiles, isMarkdownFile } from '@/lib/markdown-image'
import { trpc } from '@renderer/lib/trpc'
import { cn } from '@/lib/utils'

function hasFiles(event: DragEvent) {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files')
}

function buildPrefix(path: string[]) {
  if (path.length === 0) return undefined
  return `${path.join('/')}/`
}

type UploadCallbacks = {
  onUploadStart?: () => void
  onUploadComplete?: () => void
}

type PendingDrop = {
  files: File[]
  callbacks?: UploadCallbacks
}

type ParsingStatus = {
  stage: string
  current: number
  total: number
}

function mergeFiles(primary: File[], extra: File[]): File[] {
  const results: File[] = []
  const seen = new Set<string>()
  for (const file of [...primary, ...extra]) {
    const key = `${file.name}:${file.size}:${file.lastModified}`
    if (seen.has(key)) continue
    seen.add(key)
    results.push(file)
  }
  return results
}

export function GlobalUploadController() {
  const [isDragging, setIsDragging] = useState(false)
  const [markdownPromptOpen, setMarkdownPromptOpen] = useState(false)
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null)
  const [isParsingMarkdown, setIsParsingMarkdown] = useState(false)
  const [parsingDialogOpen, setParsingDialogOpen] = useState(false)
  const [parsingStatus, setParsingStatus] = useState<ParsingStatus | null>(null)
  const dragCounter = useRef(0)
  const trpcUtils = trpc.useUtils()

  const { currentProvider, currentBucket, currentPath } = useNavigationStore()
  const contextPrefix = useMemo(() => buildPrefix(currentPath), [currentPath])

  const {
    isOpen,
    files,
    onUploadStart,
    onUploadComplete,
    openWithFiles,
    setOpen,
    setMarkdownData
  } = useGlobalUploadStore()

  const { data: contextProvider } = trpc.provider.getById.useQuery(
    { id: currentProvider?.id ?? '' },
    { enabled: Boolean(currentProvider?.id) && Boolean(currentBucket) }
  )

  const markdownCount = useMemo(() => {
    if (!pendingDrop) return 0
    return pendingDrop.files.filter(isMarkdownFile).length
  }, [pendingDrop])

  const handleDroppedFiles = (droppedFiles: File[], callbacks?: UploadCallbacks) => {
    if (droppedFiles.some(isMarkdownFile)) {
      setPendingDrop({ files: droppedFiles, callbacks })
      setMarkdownPromptOpen(true)
      return
    }

    openWithFiles(droppedFiles, callbacks)
  }

  const handleSkipMarkdown = () => {
    if (!pendingDrop) {
      setMarkdownPromptOpen(false)
      return
    }

    openWithFiles(pendingDrop.files, pendingDrop.callbacks)
    setPendingDrop(null)
    setMarkdownPromptOpen(false)
  }

  const handleParseMarkdown = async () => {
    if (!pendingDrop) return
    setIsParsingMarkdown(true)
    setMarkdownPromptOpen(false)
    setParsingDialogOpen(true)
    setParsingStatus({ stage: 'Scanning markdown files', current: 0, total: 0 })
    let tempDir: string | null = null
    let cleanupAfterUpload = false

    try {
      tempDir = await window.api.createMarkdownTempDir()
      const result = await extractMarkdownDataFromFiles(pendingDrop.files, {
        tempDir,
        onStage: (stage) => {
          if (stage === 'scan') {
            setParsingStatus((prev) => ({
              stage: 'Scanning markdown files',
              current: prev?.current ?? 0,
              total: prev?.total ?? 0
            }))
          } else {
            setParsingStatus((prev) => ({
              stage: 'Loading referenced images',
              current: prev?.current ?? 0,
              total: prev?.total ?? 0
            }))
          }
        },
        onProgress: (current, total) => {
          setParsingStatus((prev) => ({
            stage: prev?.stage ?? 'Loading referenced images',
            current,
            total
          }))
        }
      })

      const nonMarkdownFiles = pendingDrop.files.filter((file) => !isMarkdownFile(file))
      const combinedFiles = mergeFiles(nonMarkdownFiles, result.files)
      const existingOnComplete = pendingDrop.callbacks?.onUploadComplete
      cleanupAfterUpload = true
      openWithFiles(combinedFiles, {
        ...pendingDrop.callbacks,
        onUploadComplete: async () => {
          if (tempDir) {
            try {
              await window.api.removeMarkdownTempDir(tempDir)
            } catch (error) {
              console.error('[MarkdownUpload] Failed to cleanup temp dir:', error)
            }
          }
          existingOnComplete?.()
        }
      })
      // Set markdown data AFTER openWithFiles to avoid being reset
      setMarkdownData(result.markdownData)
    } catch (error) {
      console.error('[MarkdownUpload] Failed to extract images:', error)
      openWithFiles(pendingDrop.files, pendingDrop.callbacks)
    } finally {
      if (tempDir && !cleanupAfterUpload) {
        try {
          await window.api.removeMarkdownTempDir(tempDir)
        } catch (error) {
          console.error('[MarkdownUpload] Failed to cleanup temp dir:', error)
        }
      }
      setIsParsingMarkdown(false)
      setParsingDialogOpen(false)
      setParsingStatus(null)
      setPendingDrop(null)
    }
  }

  useEffect(() => {
    const handleDragEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return
      if (useGlobalUploadStore.getState().isOpen) return
      event.preventDefault()
      dragCounter.current += 1
      setIsDragging(true)
    }

    const handleDragOver = (event: DragEvent) => {
      if (!hasFiles(event)) return
      if (useGlobalUploadStore.getState().isOpen) return
      event.preventDefault()
    }

    const handleDragLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return
      if (useGlobalUploadStore.getState().isOpen) return
      event.preventDefault()
      dragCounter.current = Math.max(0, dragCounter.current - 1)
      if (dragCounter.current === 0) {
        setIsDragging(false)
      }
    }

    const handleDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return
      if (useGlobalUploadStore.getState().isOpen) return
      event.preventDefault()
      dragCounter.current = 0
      setIsDragging(false)
      const droppedFiles = Array.from(event.dataTransfer?.files ?? [])
      if (droppedFiles.length === 0) return
      handleDroppedFiles(droppedFiles, {
        onUploadComplete: () => {
          trpcUtils.provider.listObjects.invalidate()
          trpcUtils.uploadHistory.list.invalidate()
        }
      })
    }

    window.addEventListener('dragenter', handleDragEnter, true)
    window.addEventListener('dragover', handleDragOver, true)
    window.addEventListener('dragleave', handleDragLeave, true)
    window.addEventListener('drop', handleDrop, true)

    return () => {
      window.removeEventListener('dragenter', handleDragEnter, true)
      window.removeEventListener('dragover', handleDragOver, true)
      window.removeEventListener('dragleave', handleDragLeave, true)
      window.removeEventListener('drop', handleDrop, true)
    }
  }, [])

  useEffect(() => {
    if (!window.api?.notifyOpenFilesReady || !window.api?.onOpenFiles || !window.api?.readFile) {
      return
    }

    window.api.notifyOpenFilesReady()
    const unsubscribe = window.api.onOpenFiles(async (filePaths) => {
      const filesFromPaths = await Promise.all(
        filePaths.map(async (filePath) => {
          try {
            const result = await window.api.readFile(filePath)
            const data =
              result.data instanceof Uint8Array ? result.data : new Uint8Array(result.data)
            const arrayBuffer = Uint8Array.from(data).buffer
            return new File([arrayBuffer], result.name, { type: result.mimeType || '' })
          } catch (error) {
            console.error('[OpenFiles] Failed to read file:', filePath, error)
            return null
          }
        })
      )

      const validFiles = filesFromPaths.filter((file): file is File => Boolean(file))
      if (validFiles.length === 0) return

      const state = useGlobalUploadStore.getState()
      if (state.isOpen) {
        state.appendFiles(validFiles)
      } else {
        state.openWithFiles(validFiles)
      }
    })

    return unsubscribe
  }, [])

  const handleOverlayDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    dragCounter.current = 0
    setIsDragging(false)
    const droppedFiles = Array.from(event.dataTransfer.files)
    if (droppedFiles.length === 0) return

    handleDroppedFiles(droppedFiles, {
      onUploadComplete: () => {
        trpcUtils.provider.listObjects.invalidate()
        trpcUtils.uploadHistory.list.invalidate()
      }
    })
  }

  return (
    <>
      {isDragging && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleOverlayDrop}
        >
          <div
            className={cn(
              'flex flex-col items-center gap-3 rounded-md border border-dashed border-white/50',
              'bg-white/95 px-8 py-6 text-center shadow-lg'
            )}
          >
            <IconCloudUpload size={36} className="text-blue-600" />
            <div className="space-y-1">
              <p className="text-base font-semibold text-slate-900">Drop files to upload</p>
              <p className="text-xs text-slate-600">Upload dialog will open automatically</p>
            </div>
          </div>
        </div>
      )}

      <UploadFilesDrawer
        open={isOpen}
        onOpenChange={setOpen}
        files={files}
        provider={contextProvider ?? undefined}
        bucket={currentBucket ?? undefined}
        prefix={contextPrefix}
        lockTarget={Boolean(currentBucket)}
        onUploadStart={() => {
          onUploadStart?.()
        }}
        onUploadComplete={() => {
          onUploadComplete?.()
        }}
      />

      <AlertDialog
        open={markdownPromptOpen}
        onOpenChange={(open) => {
          if (!open && !isParsingMarkdown) {
            handleSkipMarkdown()
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <IconFileText className="text-foreground" />
            </AlertDialogMedia>
            <AlertDialogTitle>Parse images from Markdown?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Detected {markdownCount} markdown file{markdownCount !== 1 && 's'}. Extract
                referenced images and add them to this upload?
              </p>
              <p className="text-xs text-muted-foreground">
                Markdown files will be skipped; referenced images will be added.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isParsingMarkdown}>Skip</AlertDialogCancel>
            <AlertDialogAction onClick={handleParseMarkdown} disabled={isParsingMarkdown}>
              {isParsingMarkdown ? (
                <>
                  <IconLoader2 size={16} className="mr-2 animate-spin" />
                  Parsing...
                </>
              ) : (
                'Parse images'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={parsingDialogOpen} onOpenChange={() => undefined}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconLoader2 size={18} className="animate-spin" />
              Parsing markdown
            </DialogTitle>
            <DialogDescription className="space-y-1">
              <div>{parsingStatus?.stage ?? 'Preparing to parse files...'}</div>
              {parsingStatus && parsingStatus.total > 0 && (
                <div className="text-xs text-muted-foreground">
                  {parsingStatus.current}/{parsingStatus.total}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  )
}
