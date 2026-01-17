import { useMemo } from 'react'
import { IconTrash, IconCloudDownload } from '@tabler/icons-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { DownloadTaskItem } from './download-task-item'
import { useDownloadStore } from '@renderer/stores/download-store'

export function DownloadManagerDrawer() {
  const tasks = useDownloadStore((state) => state.tasks)
  const isDrawerOpen = useDownloadStore((state) => state.isDrawerOpen)
  const setDrawerOpen = useDownloadStore((state) => state.setDrawerOpen)
  const removeTask = useDownloadStore((state) => state.removeTask)
  const clearCompleted = useDownloadStore((state) => state.clearCompleted)

  const { activeTasks, completedTasks, errorTasks } = useMemo(() => {
    return {
      activeTasks: tasks.filter((t) => t.status === 'downloading'),
      completedTasks: tasks.filter((t) => t.status === 'completed'),
      errorTasks: tasks.filter((t) => t.status === 'error')
    }
  }, [tasks])

  const hasCompletedTasks = completedTasks.length > 0
  const totalTaskCount = tasks.length
  const activeCount = activeTasks.length
  const errorCount = errorTasks.length

  return (
    <Sheet open={isDrawerOpen} onOpenChange={setDrawerOpen}>
      <SheetContent side="left" className="p-0 flex flex-col  rounded-md">
        <SheetHeader className="p-4 pb-0 pr-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconCloudDownload size={20} className="text-muted-foreground" />
              <SheetTitle>Downloads</SheetTitle>
            </div>
            {hasCompletedTasks && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCompleted}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                <IconTrash size={14} className="mr-1" />
                Clear completed
              </Button>
            )}
          </div>
          <SheetDescription>
            {totalTaskCount === 0
              ? 'No downloads'
              : activeCount > 0
                ? `${activeCount} active, ${completedTasks.length} completed${errorCount > 0 ? `, ${errorCount} failed` : ''}`
                : `${completedTasks.length} completed${errorCount > 0 ? `, ${errorCount} failed` : ''}`}
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-2" />

        <ScrollArea className="flex-1">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <IconCloudDownload size={40} className="text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No download tasks</p>
              <p className="text-xs text-muted-foreground mt-1">Start a download to see it here</p>
            </div>
          ) : (
            <div className="space-y-3 p-2">
              {activeTasks.length > 0 && (
                <div className="overflow-hidden rounded-md border">
                  <div className="bg-muted/40 px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">
                    Active ({activeTasks.length})
                  </div>
                  <div className="divide-y divide-border">
                    {activeTasks.map((task) => (
                      <DownloadTaskItem key={task.id} task={task} onRemove={removeTask} />
                    ))}
                  </div>
                </div>
              )}

              {errorTasks.length > 0 && (
                <div className="overflow-hidden rounded-md border">
                  <div className="bg-muted/40 px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">
                    Failed ({errorTasks.length})
                  </div>
                  <div className="divide-y divide-border">
                    {errorTasks.map((task) => (
                      <DownloadTaskItem key={task.id} task={task} onRemove={removeTask} />
                    ))}
                  </div>
                </div>
              )}

              {completedTasks.length > 0 && (
                <div className="overflow-hidden rounded-md border">
                  <div className="bg-muted/40 px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">
                    Completed ({completedTasks.length})
                  </div>
                  <div className="divide-y divide-border">
                    {completedTasks.map((task) => (
                      <DownloadTaskItem key={task.id} task={task} onRemove={removeTask} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
