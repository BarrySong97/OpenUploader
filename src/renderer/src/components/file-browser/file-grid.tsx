import { format } from 'date-fns'
import { IconFolder, IconDotsVertical } from '@tabler/icons-react'
import type { FileItem } from '@/lib/types'
import { formatFileSize } from '@/lib/utils'
import { getFileIcon } from '@/lib/file-utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

interface FileGridProps {
  files: FileItem[]
  onFileClick: (file: FileItem) => void
  onDownload?: (file: FileItem) => void
  onDelete?: (file: FileItem) => void
  onCopyUrl?: (file: FileItem) => void
  onRename?: (file: FileItem) => void
}

export function FileGrid({
  files,
  onFileClick,
  onDownload,
  onDelete,
  onCopyUrl,
  onRename
}: FileGridProps) {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <IconFolder size={48} className="mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">This folder is empty</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {files.map((file) => (
        <div
          key={file.id}
          className="group relative flex flex-col items-center rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
        >
          {/* File Icon */}
          <button
            onClick={() => onFileClick(file)}
            className="flex w-full flex-col items-center gap-2 text-center"
          >
            <div className="flex size-16 items-center justify-center">
              {getFileIcon(file, 'large')}
            </div>
            <span className="line-clamp-2 w-full text-sm font-medium">{file.name}</span>
          </button>

          {/* File Info */}
          <div className="mt-2 flex flex-col items-center gap-1 text-xs text-muted-foreground">
            {file.type === 'file' && <span>{formatFileSize(file.size || 0)}</span>}
            <span>{format(file.modified, 'MMM d, yyyy')}</span>
          </div>

          {/* Actions Dropdown */}
          <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="default" className="size-8 p-0">
                  <IconDotsVertical size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {file.type === 'file' && (
                  <>
                    <DropdownMenuItem onClick={() => onDownload?.(file)}>
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onCopyUrl?.(file)}>
                      Copy URL
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => onRename?.(file)}>Rename</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete?.(file)}
                  variant="destructive"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </div>
  )
}
