import { createRootRoute, Outlet } from '@tanstack/react-router'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Toaster } from 'sonner'

export const Route = createRootRoute({
  component: () => (
    <div className="flex overflow-hidden   min-h-screen bg-[#f2f8f3bf]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="h-[30px] fixed right-0 w-[120px] draggable z-50"></div>
        <Header />
        <div className="h-[calc(100vh-48px)] bg-white flex-1 overflow-hidden rounded-tl-md">
          <Outlet />
        </div>
      </main>
      <Toaster />
    </div>
  )
})
