import { format } from 'date-fns'
import { IconDotsVertical, IconFolder } from '@tabler/icons-react'
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

interface FileListProps {
  files: FileItem[]
  onFileClick: (file: FileItem) => void
  onDownload?: (file: FileItem) => void
  onDelete?: (file: FileItem) => void
  onCopyUrl?: (file: FileItem) => void
  onRename?: (file: FileItem) => void
}

export function FileList({
  files,
  onFileClick,
  onDownload,
  onDelete,
  onCopyUrl,
  onRename
}: FileListProps) {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <IconFolder size={48} className="mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">This folder is empty</p>
      </div>
    )
  }

  return (
    <div className="overflow-auto">
      <table className="w-full">
        <thead className="border-b border-border bg-muted/30">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Name</th>
            <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Size</th>
            <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
              Modified
            </th>
            <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => (
            <tr
              key={file.id}
              className="border-b border-border transition-colors hover:bg-muted/50"
            >
              <td className="px-6 py-4">
                <button
                  onClick={() => onFileClick(file)}
                  className="flex items-center gap-3 text-left"
                >
                  {getFileIcon(file, 'small')}
                  <span className="font-medium">{file.name}</span>
                </button>
              </td>
              <td className="px-6 py-4 text-sm text-muted-foreground">
                {file.type === 'folder' ? '-' : formatFileSize(file.size || 0)}
              </td>
              <td className="px-6 py-4 text-sm text-muted-foreground">
                {format(file.modified, 'MMM d, yyyy')}
              </td>
              <td className="px-6 py-4 text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="default">
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
