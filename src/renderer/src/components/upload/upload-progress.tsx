import { IconFile, IconCheck, IconX, IconPlayerPause, IconPlayerPlay } from '@tabler/icons-react'
import type { UploadItem } from '@/lib/types'
import { formatFileSize } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface UploadProgressProps {
  upload: UploadItem
  onPause?: (id: string) => void
  onResume?: (id: string) => void
  onCancel?: (id: string) => void
}

export function UploadProgress({ upload, onPause, onResume, onCancel }: UploadProgressProps) {
  const getStatusBadge = () => {
    switch (upload.status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-500">
            <IconCheck size={14} className="mr-1" />
            Completed
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="destructive">
            <IconX size={14} className="mr-1" />
            Error
          </Badge>
        )
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>
      case 'uploading':
        return <Badge variant="default">Uploading</Badge>
      default:
        return <Badge variant="secondary">Pending</Badge>
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
            <IconFile size={20} className="text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-medium">{upload.name}</p>
            <p className="text-sm text-muted-foreground">{formatFileSize(upload.size)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          {upload.status === 'uploading' && (
            <Button variant="ghost" size="sm" onClick={() => onPause?.(upload.id)}>
              <IconPlayerPause size={16} />
            </Button>
          )}
          {upload.status === 'paused' && (
            <Button variant="ghost" size="sm" onClick={() => onResume?.(upload.id)}>
              <IconPlayerPlay size={16} />
            </Button>
          )}
          {upload.status !== 'completed' && (
            <Button variant="ghost" size="sm" onClick={() => onCancel?.(upload.id)}>
              <IconX size={16} />
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {upload.status === 'uploading' || upload.status === 'paused' ? (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{upload.progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${upload.progress}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* Error Message */}
      {upload.status === 'error' && upload.error && (
        <p className="mt-2 text-sm text-destructive">{upload.error}</p>
      )}
    </div>
  )
}
