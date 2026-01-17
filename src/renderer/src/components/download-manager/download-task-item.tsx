import {
  IconFile,
  IconPhoto,
  IconLoader2,
  IconCheck,
  IconX,
  IconAlertTriangle
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { formatFileSize, cn } from '@/lib/utils'
import type { DownloadTask, DownloadStatus } from '@renderer/stores/download-store'

interface DownloadTaskItemProps {
  task: DownloadTask
  onRemove?: (id: string) => void
}

function StatusIcon({ status }: { status: DownloadStatus }) {
  switch (status) {
    case 'downloading':
      return <IconLoader2 size={14} className="animate-spin text-blue-500" />
    case 'completed':
      return <IconCheck size={14} className="text-green-500" />
    case 'error':
      return <IconAlertTriangle size={14} className="text-destructive" />
    default:
      return null
  }
}

function getStatusText(status: DownloadStatus): string {
  switch (status) {
    case 'downloading':
      return 'Downloading...'
    case 'completed':
      return 'Completed'
    case 'error':
      return 'Failed'
    default:
      return ''
  }
}

function isImageFilename(fileName: string): boolean {
  return /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(fileName)
}

export function DownloadTaskItem({ task, onRemove }: DownloadTaskItemProps) {
  const isImage = isImageFilename(task.fileName)

  return (
    <div className="flex items-start gap-3 p-3 border-b border-border last:border-b-0">
      <div className="mt-0.5 shrink-0">
        {isImage ? (
          <IconPhoto size={18} className="text-blue-500" />
        ) : (
          <IconFile size={18} className="text-muted-foreground" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{task.fileName}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <StatusIcon status={task.status} />
          <span
            className={cn(
              'text-xs',
              task.status === 'error' ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {getStatusText(task.status)}
          </span>
          <span className="text-xs text-muted-foreground">{formatFileSize(task.fileSize)}</span>
        </div>
        {task.status === 'completed' && task.filePath && (
          <button
            type="button"
            className="mt-1 text-left text-xs text-primary hover:underline break-all"
            onClick={() => window.api.showInFolder(task.filePath!)}
          >
            {task.filePath}
          </button>
        )}
        {task.status === 'error' && task.error && (
          <p className="text-xs text-destructive mt-1 truncate">{task.error}</p>
        )}
      </div>

      <div className="shrink-0">
        {(task.status === 'completed' || task.status === 'error') && onRemove && (
          <Button variant="ghost" size="icon-sm" onClick={() => onRemove(task.id)}>
            <IconX size={14} />
          </Button>
        )}
      </div>
    </div>
  )
}
