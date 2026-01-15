import { useMemo } from 'react'
import { IconTrash, IconCloudUpload } from '@tabler/icons-react'
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
import { UploadTaskItem } from './upload-task-item'
import { useUploadStore } from '@renderer/stores/upload-store'

export function UploadManagerDrawer() {
  const tasks = useUploadStore((state) => state.tasks)
  const isDrawerOpen = useUploadStore((state) => state.isDrawerOpen)
  const setDrawerOpen = useUploadStore((state) => state.setDrawerOpen)
  const removeTask = useUploadStore((state) => state.removeTask)
  const clearCompleted = useUploadStore((state) => state.clearCompleted)

  const { activeTasks, pendingTasks, completedTasks, errorTasks } = useMemo(() => {
    return {
      activeTasks: tasks.filter((t) => ['compressing', 'uploading'].includes(t.status)),
      pendingTasks: tasks.filter((t) => t.status === 'pending'),
      completedTasks: tasks.filter((t) => t.status === 'completed'),
      errorTasks: tasks.filter((t) => t.status === 'error')
    }
  }, [tasks])

  const hasCompletedTasks = completedTasks.length > 0
  const totalTaskCount = tasks.length
  const activeCount = activeTasks.length + pendingTasks.length
  const errorCount = errorTasks.length

  return (
    <Sheet open={isDrawerOpen} onOpenChange={setDrawerOpen}>
      <SheetContent side="bottom" className="p-0 flex flex-col !h-[90vh] rounded-t-md">
        <SheetHeader className="p-4 pb-0 pr-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconCloudUpload size={20} className="text-muted-foreground" />
              <SheetTitle>Uploads</SheetTitle>
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
              ? 'No uploads'
              : activeCount > 0
                ? `${activeCount} active, ${completedTasks.length} completed${errorCount > 0 ? `, ${errorCount} failed` : ''}`
                : `${completedTasks.length} completed${errorCount > 0 ? `, ${errorCount} failed` : ''}`}
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-2" />

        <ScrollArea className="flex-1">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <IconCloudUpload size={40} className="text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No upload tasks</p>
              <p className="text-xs text-muted-foreground mt-1">Drop files to start uploading</p>
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
                      <UploadTaskItem key={task.id} task={task} onRemove={removeTask} />
                    ))}
                  </div>
                </div>
              )}

              {pendingTasks.length > 0 && (
                <div className="overflow-hidden rounded-md border">
                  <div className="bg-muted/40 px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">
                    Pending ({pendingTasks.length})
                  </div>
                  <div className="divide-y divide-border">
                    {pendingTasks.map((task) => (
                      <UploadTaskItem key={task.id} task={task} onRemove={removeTask} />
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
                      <UploadTaskItem key={task.id} task={task} onRemove={removeTask} />
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
                      <UploadTaskItem key={task.id} task={task} onRemove={removeTask} />
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
