import { format } from 'date-fns'
import {
  IconDownload,
  IconTrash,
  IconCheck,
  IconX,
  IconRefresh,
  IconCopy
} from '@tabler/icons-react'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { cn, formatFileSize } from '@/lib/utils'
import { getFileIcon } from '@/lib/file-utils'

interface UploadHistoryItem {
  id: string
  providerId: string
  bucket: string
  key: string
  name: string
  type: 'file' | 'folder'
  size?: number | null
  mimeType?: string | null
  uploadedAt: string
  isCompressed?: boolean | null
  status: string
  errorMessage?: string | null
}

interface UploadHistoryTableProps {
  data: UploadHistoryItem[]
  selectable?: boolean
  selectedItems?: Record<
    string,
    { providerId: string; bucket: string; key: string; type: 'file' | 'folder'; name: string }
  >
  onToggleSelection?: (
    item: {
      id: string
      providerId: string
      bucket: string
      key: string
      type: 'file' | 'folder'
      name: string
    },
    checked: boolean
  ) => void
  onToggleAll?: (checked: boolean) => void
  onRowClick?: (item: UploadHistoryItem) => void
  onDownload?: (providerId: string, bucket: string, key: string, fileName: string) => void
  onCopyUrl?: (providerId: string, bucket: string, key: string) => Promise<string>
  onDelete?: (target: {
    id: string
    providerId: string
    bucket: string
    key: string
    type: 'file' | 'folder'
    name: string
  }) => void
  isDeleting?: boolean
}

export function UploadHistoryTable({
  data,
  selectable = false,
  selectedItems = {},
  onToggleSelection,
  onToggleAll,
  onRowClick,
  onDownload,
  onCopyUrl,
  onDelete,
  isDeleting = false
}: UploadHistoryTableProps) {
  const renderStatusBadge = (status: string, errorMessage?: string | null) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-500">
            <IconCheck size={14} className="mr-1" />
            Completed
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="destructive" title={errorMessage ?? undefined}>
            <IconX size={14} className="mr-1" />
            Failed
          </Badge>
        )
      case 'uploading':
        return (
          <Badge variant="secondary">
            <IconRefresh size={14} className="mr-1 animate-spin" />
            Uploading
          </Badge>
        )
      default:
        return <Badge variant="secondary">Pending</Badge>
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {selectable && onToggleAll && (
              <TableHead className="w-10">
                <Checkbox
                  checked={
                    data.length > 0 &&
                    (data.every((item) => selectedItems[item.id])
                      ? true
                      : data.some((item) => selectedItems[item.id])
                        ? 'indeterminate'
                        : false)
                  }
                  onCheckedChange={(value) =>
                    onToggleAll(value === true || value === 'indeterminate')
                  }
                  aria-label="Select all"
                />
              </TableHead>
            )}
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Name
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Bucket
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Size
            </TableHead>
            {selectable && (
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </TableHead>
            )}
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Uploaded
            </TableHead>
            <TableHead className={cn(selectable ? 'w-24' : 'w-16')} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <UploadHistoryRow
              key={item.id}
              item={item}
              selectable={selectable}
              isSelected={!!selectedItems[item.id]}
              onRowClick={onRowClick}
              onToggleSelection={onToggleSelection}
              onDownload={onDownload}
              onCopyUrl={onCopyUrl}
              onDelete={onDelete}
              isDeleting={isDeleting}
              renderStatusBadge={renderStatusBadge}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

interface UploadHistoryRowProps {
  item: UploadHistoryItem
  selectable: boolean
  isSelected: boolean
  onRowClick?: (item: UploadHistoryItem) => void
  onToggleSelection?: (
    item: {
      id: string
      providerId: string
      bucket: string
      key: string
      type: 'file' | 'folder'
      name: string
    },
    checked: boolean
  ) => void
  onDownload?: (providerId: string, bucket: string, key: string, fileName: string) => void
  onCopyUrl?: (providerId: string, bucket: string, key: string) => Promise<string>
  onDelete?: (target: {
    id: string
    providerId: string
    bucket: string
    key: string
    type: 'file' | 'folder'
    name: string
  }) => void
  isDeleting: boolean
  renderStatusBadge: (status: string, errorMessage?: string | null) => React.ReactNode
}

function UploadHistoryRow({
  item,
  selectable,
  isSelected,
  onRowClick,
  onToggleSelection,
  onDownload,
  onCopyUrl,
  onDelete,
  isDeleting,
  renderStatusBadge
}: UploadHistoryRowProps) {
  const { copied, copyToClipboard } = useCopyToClipboard()

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onCopyUrl) {
      const url = await onCopyUrl(item.providerId, item.bucket, item.key)
      if (url) {
        await copyToClipboard(url)
      }
    }
  }

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDownload?.(item.providerId, item.bucket, item.key, item.name)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.({
      id: item.id,
      providerId: item.providerId,
      bucket: item.bucket,
      key: item.key,
      type: item.type,
      name: item.name
    })
  }

  const fileIcon = getFileIcon(
    {
      name: item.name,
      type: item.type as 'file' | 'folder',
      id: item.id,
      modified: new Date(),
      size: item.size || 0
    },
    'small'
  )

  return (
    <TableRow className="group cursor-pointer" onClick={() => onRowClick?.(item)}>
      {selectable && onToggleSelection && (
        <TableCell onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={(value) =>
              onToggleSelection(
                {
                  id: item.id,
                  providerId: item.providerId,
                  bucket: item.bucket,
                  key: item.key,
                  type: item.type,
                  name: item.name
                },
                value === true
              )
            }
            aria-label={`Select ${item.name}`}
          />
        </TableCell>
      )}
      <TableCell className="max-w-64">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0">{fileIcon}</div>
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="font-medium break-all">{item.name}</span>
            {item.isCompressed && (
              <Badge variant="secondary" className="text-xs">
                Compressed
              </Badge>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{item.bucket}</TableCell>
      <TableCell className="text-muted-foreground">
        {item.size ? formatFileSize(item.size) : '-'}
      </TableCell>
      {selectable && <TableCell>{renderStatusBadge(item.status, item.errorMessage)}</TableCell>}
      <TableCell className="text-muted-foreground">
        {format(new Date(item.uploadedAt), 'MMM dd, yyyy HH:mm')}
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {item.type === 'file' && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={handleDownload}
              >
                <IconDownload size={16} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={handleCopy}
              >
                {copied ? (
                  <IconCheck size={16} className="text-green-500" />
                ) : (
                  <IconCopy size={16} />
                )}
              </Button>
            </>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-7 w-7 text-muted-foreground',
                'hover:bg-red-50 hover:text-red-500',
                'dark:hover:bg-red-900/20'
              )}
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <IconTrash size={16} />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}
