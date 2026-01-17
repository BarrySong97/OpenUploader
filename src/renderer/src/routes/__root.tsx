import { createRootRoute, Outlet } from '@tanstack/react-router'
import { AppSidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { UploadFAB, UploadManagerDrawer } from '@/components/upload-manager'
import { DownloadFAB, DownloadManagerDrawer } from '@/components/download-manager'
import { Toaster } from 'sonner'
import { cn } from '@renderer/lib/utils'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useLocalStorageState } from 'ahooks'

export const Route = createRootRoute({
  component: () => {
    const [sidebarOpen, setSidebarOpen] = useLocalStorageState('sidebar-open', {
      defaultValue: true
    })

    return (
      <TooltipProvider>
        <SidebarProvider defaultOpen={sidebarOpen ?? true} onOpenChange={setSidebarOpen}>
          <AppSidebar />
          <SidebarInset className="flex flex-col overflow-hidden bg-[#f2f8f3bf]">
            <div className="h-[30px] fixed right-0 w-[120px] draggable z-50" />
            <Header />
            <div
              className={cn(
                ' flex-1 overflow-hidden rounded-t-lg bg-white',
                'h-[calc(100vh-48px)]'
              )}
            >
              <Outlet />
            </div>
          </SidebarInset>
          <Toaster />
          <DownloadFAB />
          <DownloadManagerDrawer />
          <UploadFAB />
          <UploadManagerDrawer />
        </SidebarProvider>
      </TooltipProvider>
    )
  }
})
