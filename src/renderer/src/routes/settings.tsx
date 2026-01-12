import { createFileRoute, Link, Outlet, useRouterState } from '@tanstack/react-router'
import { IconArrowLeft } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PageLayout } from '@/components/layout/page-layout'

export const Route = createFileRoute('/settings')({
  component: SettingsLayout
})

function SettingsLayout() {
  const pathname = useRouterState().location.pathname

  const isActive = (path: string) => {
    if (path === '/settings') {
      return pathname === '/settings'
    }
    return pathname.startsWith(path)
  }

  return (
    <PageLayout>
      <div className="flex gap-8">
        {/* Sidebar Navigation */}
        <nav className="w-48 shrink-0">
          <div className="space-y-1">
            <Link
              to="/settings"
              className={cn(
                'block rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent',
                isActive('/settings') && 'bg-accent text-accent-foreground'
              )}
            >
              Overview
            </Link>
            <Link
              to="/settings/providers"
              className={cn(
                'block rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent',
                isActive('/settings/providers') && 'bg-accent text-accent-foreground'
              )}
            >
              Providers
            </Link>
            <Link
              to="/settings/compression"
              className={cn(
                'block rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent',
                isActive('/settings/compression') && 'bg-accent text-accent-foreground'
              )}
            >
              Image Compression
            </Link>
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1">
          <Outlet />
        </div>
      </div>
    </PageLayout>
  )
}
