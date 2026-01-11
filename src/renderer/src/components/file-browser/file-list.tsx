import { format } from 'date-fns'
import { IconDotsVertical, IconFolder } from '@tabler/icons-react'
import type { FileItem } from '@/lib/types'
import { formatFileSize, cn } from '@/lib/utils'
import { getFileIcon } from '@/lib/file-utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
  onFileDoubleClick?: (file: FileItem) => void
  onDownload?: (file: FileItem) => void
  onDelete?: (file: FileItem) => void
  onCopyUrl?: (file: FileItem) => void
  onRename?: (file: FileItem) => void
  onMove?: (file: FileItem) => void
  // Selection props
  selectable?: boolean
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
  // Drag and drop props
  draggable?: boolean
  onDragStart?: (file: FileItem) => void
  onDrop?: (targetFolder: FileItem, sourceIds: string[]) => void
}

export function FileList({
  files,
  onFileClick,
  onFileDoubleClick,
  onDownload,
  onDelete,
  onCopyUrl,
  onRename,
  onMove,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
  draggable = false,
  onDragStart,
  onDrop
}: FileListProps) {
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange?.(new Set(files.map((f) => f.id)))
    } else {
      onSelectionChange?.(new Set())
    }
  }

  const handleSelectFile = (file: FileItem, checked: boolean) => {
    const newSelection = new Set(selectedIds)
    if (checked) {
      newSelection.add(file.id)
    } else {
      newSelection.delete(file.id)
    }
    onSelectionChange?.(newSelection)
  }

  const handleRowClick = (file: FileItem, e: React.MouseEvent) => {
    if (selectable && (e.ctrlKey || e.metaKey)) {
      // Toggle selection with Ctrl/Cmd click
      handleSelectFile(file, !selectedIds.has(file.id))
    } else {
      onFileClick(file)
    }
  }

  const handleDragStart = (e: React.DragEvent, file: FileItem) => {
    if (!draggable) return

    // If the dragged file is selected, drag all selected files
    const dragIds = selectedIds.has(file.id) ? Array.from(selectedIds) : [file.id]

    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({ type: 'file-move', ids: dragIds })
    )
    e.dataTransfer.effectAllowed = 'move'
    onDragStart?.(file)
  }

  const handleDragOver = (e: React.DragEvent, file: FileItem) => {
    if (!draggable || file.type !== 'folder') return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDropOnFolder = (e: React.DragEvent, folder: FileItem) => {
    if (!draggable || folder.type !== 'folder') return
    e.preventDefault()

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'))
      if (data.type === 'file-move' && data.ids) {
        // Don't allow dropping a folder into itself
        if (data.ids.includes(folder.id)) return
        onDrop?.(folder, data.ids)
      }
    } catch {
      // Invalid data
    }
  }

  const allSelected = files.length > 0 && files.every((f) => selectedIds.has(f.id))
  const someSelected = files.some((f) => selectedIds.has(f.id))

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
            {selectable && (
              <th className="w-12 px-3 py-3">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                />
              </th>
            )}
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
          {files.map((file) => {
            const isSelected = selectedIds.has(file.id)
            return (
              <tr
                key={file.id}
                className={cn(
                  'border-b border-border transition-colors hover:bg-muted/50 cursor-pointer',
                  isSelected && 'bg-primary/5'
                )}
                onDoubleClick={() => onFileDoubleClick?.(file)}
                draggable={draggable}
                onDragStart={(e) => handleDragStart(e, file)}
                onDragOver={(e) => handleDragOver(e, file)}
                onDrop={(e) => handleDropOnFolder(e, file)}
              >
                {selectable && (
                  <td className="w-12 px-3 py-2">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleSelectFile(file, checked as boolean)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                )}
                <td className="px-6 py-2">
                  <button
                    onClick={(e) => handleRowClick(file, e)}
                    className="flex items-center gap-3 text-left"
                  >
                    {getFileIcon(file, 'small')}
                    <span className="font-medium text-sm">{file.name}</span>
                  </button>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {file.type === 'folder' ? '-' : formatFileSize(file.size || 0)}
                </td>
                <td className="px-6 py-2 text-sm text-muted-foreground">
                  {format(file.modified, 'MMM d, yyyy')}
                </td>
                <td className="px-6 py-2 text-right">
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
                      <DropdownMenuItem onClick={() => onMove?.(file)}>Move to...</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onDelete?.(file)} variant="destructive">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
