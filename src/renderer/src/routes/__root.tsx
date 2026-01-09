import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { ProviderProvider } from '@/contexts/provider-context'
import { Sidebar } from '@/components/layout/sidebar'

export const Route = createRootRoute({
  component: () => (
    <ProviderProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
        <TanStackRouterDevtools />
      </div>
    </ProviderProvider>
  )
})
