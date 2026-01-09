import { IconX } from '@tabler/icons-react'
import type { UploadItem } from '@/lib/types'
import { UploadProgress } from './upload-progress'
import { Button } from '@/components/ui/button'

interface UploadQueueProps {
  uploads: UploadItem[]
  onPause?: (id: string) => void
  onResume?: (id: string) => void
  onCancel?: (id: string) => void
  onClearCompleted?: () => void
  onClose?: () => void
}

export function UploadQueue({
  uploads,
  onPause,
  onResume,
  onCancel,
  onClearCompleted,
  onClose
}: UploadQueueProps) {
  const activeUploads = uploads.filter((u) => u.status !== 'completed')
  const completedUploads = uploads.filter((u) => u.status === 'completed')

  if (uploads.length === 0) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 rounded-lg border border-border bg-background shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h3 className="font-semibold">Uploads</h3>
          <p className="text-sm text-muted-foreground">
            {activeUploads.length} active · {completedUploads.length} completed
          </p>
        </div>
        <div className="flex items-center gap-2">
          {completedUploads.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onClearCompleted}>
              Clear
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            <IconX size={16} />
          </Button>
        </div>
      </div>

      {/* Upload List */}
      <div className="max-h-96 space-y-3 overflow-y-auto p-4">
        {uploads.map((upload) => (
          <UploadProgress
            key={upload.id}
            upload={upload}
            onPause={onPause}
            onResume={onResume}
            onCancel={onCancel}
          />
        ))}
      </div>
    </div>
  )
}
