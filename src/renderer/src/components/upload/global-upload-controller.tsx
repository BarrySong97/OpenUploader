import { useEffect, useMemo, useRef, useState } from 'react'
import { IconCloudUpload } from '@tabler/icons-react'
import { UploadFilesDrawer } from '@/components/provider/upload-files-drawer'
import { useGlobalUploadStore } from '@renderer/stores/global-upload-store'
import { useNavigationStore } from '@renderer/stores/navigation-store'
import { trpc } from '@renderer/lib/trpc'
import { cn } from '@/lib/utils'

function hasFiles(event: DragEvent) {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files')
}

function buildPrefix(path: string[]) {
  if (path.length === 0) return undefined
  return `${path.join('/')}/`
}

export function GlobalUploadController() {
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)
  const trpcUtils = trpc.useUtils()

  const { currentProvider, currentBucket, currentPath } = useNavigationStore()
  const contextPrefix = useMemo(() => buildPrefix(currentPath), [currentPath])

  const { isOpen, files, onUploadStart, onUploadComplete, openWithFiles, setOpen } =
    useGlobalUploadStore()

  const { data: contextProvider } = trpc.provider.getById.useQuery(
    { id: currentProvider?.id ?? '' },
    { enabled: Boolean(currentProvider?.id) && Boolean(currentBucket) }
  )

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
      openWithFiles(droppedFiles, {
        onUploadComplete: () => {
          trpcUtils.provider.listObjects.invalidate()
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

    openWithFiles(droppedFiles, {
      onUploadComplete: () => {
        trpcUtils.provider.listObjects.invalidate()
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
    </>
  )
}
