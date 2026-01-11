import { IconTrash, IconFolderSymlink, IconX } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'

interface BatchToolbarProps {
  selectedCount: number
  onDelete: () => void
  onMove: () => void
  onClearSelection: () => void
}

export function BatchToolbar({
  selectedCount,
  onDelete,
  onMove,
  onClearSelection
}: BatchToolbarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="flex items-center gap-2 border-b border-border bg-primary/5 px-6 py-2">
      <span className="text-sm font-medium">
        {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
      </span>
      <div className="flex-1" />
      <Button variant="outline" size="sm" onClick={onMove} className="h-7">
        <IconFolderSymlink size={14} className="mr-1.5" />
        Move
      </Button>
      <Button variant="outline" size="sm" onClick={onDelete} className="h-7 text-destructive hover:text-destructive">
        <IconTrash size={14} className="mr-1.5" />
        Delete
      </Button>
      <Button variant="ghost" size="sm" onClick={onClearSelection} className="h-7 px-2">
        <IconX size={14} />
      </Button>
    </div>
  )
}
