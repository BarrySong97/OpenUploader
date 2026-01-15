import { format } from 'date-fns'
import { IconDownload, IconCopy, IconLoader2 } from '@tabler/icons-react'
import { trpc, type TRPCProvider } from '@renderer/lib/trpc'
import type { FileItem } from '@/lib/types'
import { formatFileSize } from '@/lib/utils'
import { getFileIcon } from '@/lib/file-utils'
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

  const handleDownload = () => {
    if (urlData?.url) {
      window.open(urlData.url, '_blank')
    }
  }

  const handleCopyUrl = async () => {
    if (urlData?.url) {
      await navigator.clipboard.writeText(urlData.url)
    }
  }

  if (!file) return null

  const isImage = isImageFile(file.mimeType)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {getFileIcon(file, 'small')}
            <span className="truncate">{file.name}</span>
          </SheetTitle>
          <SheetDescription>File details</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
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
              <p className="text-sm">{file.type === 'folder' ? 'Folder' : file.mimeType || 'Unknown'}</p>
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
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDownload}
                disabled={urlLoading || !urlData?.url}
              >
                <IconDownload size={16} className="mr-2" />
                Download
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCopyUrl}
                disabled={urlLoading || !urlData?.url}
              >
                <IconCopy size={16} className="mr-2" />
                Copy URL
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
