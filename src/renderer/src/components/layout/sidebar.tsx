import { Link, useRouterState } from '@tanstack/react-router'
import { IconPlus, IconSettings, IconHome } from '@tabler/icons-react'
import { useProviders } from '@/contexts/provider-context'
import { ProviderAvatar } from '@/components/provider/provider-avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const { providers, selectProvider } = useProviders()
  const router = useRouterState()
  const currentPath = router.location.pathname

  const isProviderActive = (providerId: string) => {
    return currentPath.includes(`/provider/${providerId}`)
  }

  return (
    <div className="flex h-full w-20 flex-col border-r border-border bg-background">
      {/* Home Button */}
      <div className="border-b border-border py-3.5">
        <div className="flex flex-col items-center">
          <Link
            to="/"
            className={cn(
              'group relative flex size-14 items-center justify-center rounded-2xl transition-all hover:rounded-xl',
              currentPath === '/'
                ? 'rounded-xl bg-accent ring-2 ring-primary/20 shadow-lg'
                : 'bg-muted hover:bg-accent/50'
            )}
          >
            {currentPath === '/' && (
              <div className="absolute -left-5 h-10 w-2 rounded-r-full bg-primary shadow-md" />
            )}
            <div className="flex size-14 items-center justify-center">
              <IconHome size={24} className="text-muted-foreground" />
            </div>
            {/* Tooltip */}
            <div className="pointer-events-none absolute left-full ml-3 hidden whitespace-nowrap rounded-lg bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md group-hover:block">
              Dashboard
            </div>
          </Link>
        </div>
      </div>

      {/* Provider List */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="flex flex-col items-center gap-3">
          {providers.map((provider) => (
            <Link
              key={provider.id}
              to="/provider/$providerId"
              params={{ providerId: provider.id }}
              onClick={() => selectProvider(provider.id)}
              className={cn(
                'group relative flex size-14 items-center justify-center rounded-2xl transition-all hover:rounded-xl',
                isProviderActive(provider.id)
                  ? 'rounded-xl bg-accent ring-2 ring-primary/20 shadow-lg'
                  : 'bg-muted hover:bg-accent/50'
              )}
            >
              {isProviderActive(provider.id) && (
                <div className="absolute -left-5 h-10 w-2 rounded-r-full bg-primary shadow-md" />
              )}
              <ProviderAvatar type={provider.type} size="sm" />
              {provider.connected && (
                <div className="absolute bottom-1 right-1 size-2.5 rounded-full border-2 border-background bg-green-500" />
              )}
              {/* Tooltip */}
              <div className="pointer-events-none absolute left-full ml-3 hidden whitespace-nowrap rounded-lg bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md group-hover:block">
                {provider.name}
                <Badge variant="secondary" className="ml-2">
                  {provider.stats.files}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="border-t border-border p-3">
        <div className="flex flex-col items-center gap-3">
          {/* Add Provider Button */}
          <Link to="/settings/providers">
            <Button
              size="icon"
              variant="ghost"
              className="group relative size-12 rounded-2xl hover:rounded-xl hover:bg-accent"
            >
              <IconPlus size={20} />
              <div className="pointer-events-none absolute left-full ml-3 hidden whitespace-nowrap rounded-lg bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md group-hover:block">
                Add Provider
              </div>
            </Button>
          </Link>

          {/* Settings Button */}
          <Link to="/settings">
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                'group relative size-12 rounded-2xl hover:rounded-xl',
                currentPath.startsWith('/settings')
                  ? 'rounded-xl bg-accent'
                  : 'hover:bg-accent/50'
              )}
            >
              <IconSettings size={20} />
              <div className="pointer-events-none absolute left-full ml-3 hidden whitespace-nowrap rounded-lg bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md group-hover:block">
                Settings
              </div>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
