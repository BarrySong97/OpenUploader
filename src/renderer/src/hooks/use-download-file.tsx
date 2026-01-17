import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { trpc, type TRPCProvider } from '@renderer/lib/trpc'
import { useDownloadStore } from '@renderer/stores/download-store'

interface UseDownloadFileOptions {
  provider: TRPCProvider
  bucket: string
}

interface DownloadParams {
  key: string
  fileName: string
  fileSize?: number
}

export function useDownloadFile({ provider, bucket }: UseDownloadFileOptions) {
  const [isDownloading, setIsDownloading] = useState(false)
  const addTask = useDownloadStore((state) => state.addTask)
  const updateTask = useDownloadStore((state) => state.updateTask)
  const setDrawerOpen = useDownloadStore((state) => state.setDrawerOpen)

  const showSaveDialogMutation = trpc.provider.showSaveDialog.useMutation()
  const downloadToFileMutation = trpc.provider.downloadToFile.useMutation()

  const downloadFile = useCallback(
    async ({ key, fileName, fileSize = 0 }: DownloadParams) => {
      if (isDownloading) return

      setIsDownloading(true)

      const taskId = addTask({
        key,
        fileName,
        fileSize,
        providerId: provider.id,
        bucket,
        status: 'downloading'
      })

      try {
        const dialogResult = await showSaveDialogMutation.mutateAsync({
          defaultName: fileName
        })

        if (dialogResult.canceled || !dialogResult.filePath) {
          updateTask(taskId, { status: 'error', error: 'Download canceled' })
          setDrawerOpen(true)
          return
        }

        const downloadResult = await downloadToFileMutation.mutateAsync({
          provider,
          bucket,
          key,
          savePath: dialogResult.filePath
        })

        if (downloadResult.success && downloadResult.filePath) {
          const filePath = downloadResult.filePath
          updateTask(taskId, {
            status: 'completed',
            completedAt: Date.now(),
            filePath
          })
          setDrawerOpen(true)
          toast.success('Download complete', {
            icon: null,
            description: (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground break-all">{filePath}</span>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline text-left w-fit"
                  onClick={() => {
                    window.api.showInFolder(filePath)
                  }}
                >
                  Show in Folder
                </button>
              </div>
            )
          })
        } else {
          updateTask(taskId, {
            status: 'error',
            error: downloadResult.error || 'Download failed'
          })
          toast.error('Download failed', {
            description: downloadResult.error || 'An unknown error occurred'
          })
        }
      } catch (error) {
        updateTask(taskId, {
          status: 'error',
          error: error instanceof Error ? error.message : 'An unknown error occurred'
        })
        toast.error('Download failed', {
          description: error instanceof Error ? error.message : 'An unknown error occurred'
        })
      } finally {
        setIsDownloading(false)
      }
    },
    [
      addTask,
      updateTask,
      setDrawerOpen,
      provider,
      bucket,
      isDownloading,
      showSaveDialogMutation,
      downloadToFileMutation
    ]
  )

  return {
    downloadFile,
    isDownloading
  }
}
