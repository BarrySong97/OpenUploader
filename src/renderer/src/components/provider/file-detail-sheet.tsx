import { format } from 'date-fns'
import { IconDownload, IconCopy, IconCheck, IconLoader2 } from '@tabler/icons-react'
import { trpc, type TRPCProvider } from '@renderer/lib/trpc'
import type { FileItem } from '@/lib/types'
import { formatFileSize } from '@/lib/utils'
import { getFileIcon } from '@/lib/file-utils'
import { useDownloadFile } from '@/hooks/use-download-file'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { useDownloadStore } from '@renderer/stores/download-store'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

interface FileDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: FileItem | null
  provider: TRPCProvider
  bucket: string
}

function isImageFile(mimeType?: string): boolean {
  return mimeType?.startsWith('image/') ?? false
}

export function FileDetailSheet({
  open,
  onOpenChange,
  file,
  provider,
  bucket
}: FileDetailSheetProps) {
  // Download hook
  const { downloadFile, isDownloading } = useDownloadFile({ provider, bucket })
  const downloadTasks = useDownloadStore((state) => state.tasks)

  // Copy URL hook
  const { copied: copiedUrl, copyToClipboard: copyUrlToClipboard } = useCopyToClipboard()
  const { copied: copiedMarkdown, copyToClipboard: copyMarkdownToClipboard } = useCopyToClipboard()
  // Signed URL for preview
  const { data: urlData, isLoading: urlLoading } = trpc.provider.getObjectUrl.useQuery(
    {
      provider,
      bucket,
      key: file?.id || '',
      expiresIn: 3600
    },
    {
      enabled: open && !!file && file.type === 'file',
      staleTime: 5 * 60 * 1000
    }
  )

  // Plain URL for copying (without token)
  const { data: plainUrlData } = trpc.provider.getPlainObjectUrl.useQuery(
    {
      provider,
      bucket,
      key: file?.id || ''
    },
    {
      enabled: open && !!file && file.type === 'file',
      staleTime: Infinity
    }
  )

  const handleDownload = () => {
    if (!file) return
    downloadFile({ key: file.id, fileName: file.name, fileSize: file.size || 0 })
  }

  const handleCopyUrl = async () => {
    if (plainUrlData?.url) {
      await copyUrlToClipboard(plainUrlData.url)
    }
  }

  const handleCopyMarkdown = async () => {
    if (!file) return
    const url = plainUrlData?.url || urlData?.url
    if (!url) return
    await copyMarkdownToClipboard(`![${file.name}](${url})`)
  }

  if (!file) return null

  const isImage = isImageFile(file.mimeType)
  const currentTask = downloadTasks.find((task) => task.key === file.id)
  const isFileDownloading = currentTask?.status === 'downloading'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" showCloseButton={false} className="w-[400px] sm:w-[450px]">
        <div className="flex h-full flex-col ">
          <SheetHeader className="pt-10">
            <SheetTitle className="flex items-center gap-2">
              {getFileIcon(file, 'small')}
              <span className="truncate">{file.name}</span>
            </SheetTitle>
            <SheetDescription>File details</SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-6 overflow-auto p-6">
            {/* Image Preview */}
            {isImage && file.type === 'file' && (
              <div className="overflow-hidden rounded-md border border-border bg-muted/30">
                {urlLoading ? (
                  <div className="flex h-48 items-center justify-center">
                    <IconLoader2 size={24} className="animate-spin text-muted-foreground" />
                  </div>
                ) : urlData?.url ? (
                  <img
                    src={urlData.url}
                    alt={file.name}
                    className="h-auto max-h-64 w-full object-contain"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center">
                    <p className="text-sm text-muted-foreground">Failed to load preview</p>
                  </div>
                )}
              </div>
            )}

            {/* File Info */}
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Name</p>
                <p className="text-sm break-all">{file.name}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Type</p>
                <p className="text-sm">
                  {file.type === 'folder' ? 'Folder' : file.mimeType || 'Unknown'}
                </p>
              </div>

              {file.type === 'file' && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Size</p>
                  <p className="text-sm">{formatFileSize(file.size || 0)}</p>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Modified</p>
                <p className="text-sm">{format(file.modified, 'PPpp')}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Path</p>
                <p className="text-sm break-all font-mono text-xs">{file.id}</p>
              </div>
            </div>

            {/* Actions */}
            {file.type === 'file' && (
              <div className="flex flex-col gap-2">
                {isImage && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleCopyMarkdown}
                    disabled={!plainUrlData?.url && !urlData?.url}
                  >
                    {copiedMarkdown ? (
                      <IconCheck size={16} className="mr-2 text-green-500" />
                    ) : (
                      <IconCopy size={16} className="mr-2" />
                    )}
                    {copiedMarkdown ? 'Copied!' : 'Copy Markdown'}
                  </Button>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleDownload}
                    disabled={isDownloading || isFileDownloading}
                  >
                    {isDownloading || isFileDownloading ? (
                      <IconLoader2 size={16} className="mr-2 animate-spin" />
                    ) : (
                      <IconDownload size={16} className="mr-2" />
                    )}
                    {isDownloading || isFileDownloading ? 'Downloading...' : 'Download'}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleCopyUrl}
                    disabled={!plainUrlData?.url}
                  >
                    {copiedUrl ? (
                      <IconCheck size={16} className="mr-2 text-green-500" />
                    ) : (
                      <IconCopy size={16} className="mr-2" />
                    )}
                    {copiedUrl ? 'Copied!' : 'Copy URL'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
