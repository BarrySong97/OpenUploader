import { IconRefresh, IconFolderPlus, IconUpload, IconSearch, IconList, IconLayoutGrid } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ToolbarProps {
  onRefresh?: () => void
  onNewFolder?: () => void
  onUpload?: () => void
  searchQuery?: string
  onSearchChange?: (query: string) => void
  viewMode?: 'list' | 'grid'
  onViewModeChange?: (mode: 'list' | 'grid') => void
}

export function Toolbar({
  onRefresh,
  onNewFolder,
  onUpload,
  searchQuery = '',
  onSearchChange,
  viewMode = 'list',
  onViewModeChange
}: ToolbarProps) {
  return (
    <div className="flex items-center justify-between border-b border-border bg-background px-6 py-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="default" onClick={onRefresh}>
          <IconRefresh size={18} />
        </Button>
        <Button variant="ghost" size="default" onClick={onNewFolder}>
          <IconFolderPlus size={18} className="mr-2" />
          New Folder
        </Button>
        <Button variant="default" size="default" onClick={onUpload}>
          <IconUpload size={18} className="mr-2" />
          Upload
        </Button>

        {/* View Mode Toggle */}
        <div className="ml-2 flex items-center rounded-lg border border-border">
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="default"
            onClick={() => onViewModeChange?.('list')}
            className="rounded-r-none border-r-0"
          >
            <IconList size={18} />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="default"
            onClick={() => onViewModeChange?.('grid')}
            className="rounded-l-none"
          >
            <IconLayoutGrid size={18} />
          </Button>
        </div>
      </div>

      <div className="relative w-64">
        <IconSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
          className="pl-10"
        />
      </div>
    </div>
  )
}
