import { useMemo } from 'react'
import { IconCloudDownload, IconLoader2 } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useUploadStore } from '@renderer/stores/upload-store'
import { useDownloadStore } from '@renderer/stores/download-store'
import { cn } from '@/lib/utils'

export function DownloadFAB() {
  const downloadTasks = useDownloadStore((state) => state.tasks)
  const setDrawerOpen = useDownloadStore((state) => state.setDrawerOpen)
  const uploadTasks = useUploadStore((state) => state.tasks)

  const { activeCount, hasActiveTasks, totalCount } = useMemo(() => {
    const active = downloadTasks.filter((t) => t.status === 'downloading').length
    return {
      activeCount: active,
      hasActiveTasks: active > 0,
      totalCount: downloadTasks.length
    }
  }, [downloadTasks])

  const uploadHasTasks = uploadTasks.length > 0

  if (totalCount === 0) {
    return null
  }

  return (
    <Button
      onClick={() => setDrawerOpen(true)}
      className={cn(
        'fixed right-6 z-50 h-12 w-12 rounded-full shadow-lg',
        'bg-teal-600 text-white hover:bg-teal-700',
        'hover:scale-105 transition-transform',
        hasActiveTasks && 'animate-pulse',
        uploadHasTasks ? 'bottom-[84px]' : 'bottom-6'
      )}
      size="icon"
    >
      {hasActiveTasks ? (
        <IconLoader2 size={20} className="animate-spin" />
      ) : (
        <IconCloudDownload size={20} />
      )}
      {activeCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 text-xs"
        >
          {activeCount}
        </Badge>
      )}
    </Button>
  )
}
