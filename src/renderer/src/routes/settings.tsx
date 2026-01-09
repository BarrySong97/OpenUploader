import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { IconArrowLeft } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/settings')({
  component: SettingsLayout
})

function SettingsLayout() {
  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-5xl p-8">
        <div className="mb-8">
          <Link to="/">
            <Button variant="ghost" size="default" className="mb-4">
              <IconArrowLeft size={16} className="mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="mt-2 text-muted-foreground">Manage your application settings and providers</p>
        </div>

        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <nav className="w-48 shrink-0">
            <div className="space-y-1">
              <Link
                to="/settings"
                className="block rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent [&.active]:bg-accent [&.active]:text-accent-foreground"
              >
                Overview
              </Link>
              <Link
                to="/settings/providers"
                className="block rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent [&.active]:bg-accent [&.active]:text-accent-foreground"
              >
                Providers
              </Link>
              <Link
                to="/settings/compression"
                className="block rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent [&.active]:bg-accent [&.active]:text-accent-foreground"
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
      </div>
    </div>
  )
}
