import { useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { IconPlus, IconFolder, IconChevronDown } from '@tabler/icons-react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { trpc } from '@renderer/lib/trpc'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarSeparator,
  useSidebar
} from '@/components/ui/sidebar'
import { IconLayoutSidebar } from '@tabler/icons-react'
import { AddProviderDialog } from '@/components/provider/add-provider-dialog'
import { MENU_ITEMS } from '@renderer/constants/menu'
import { ProviderBrandIcon, getProviderIconKey } from '@/components/provider/brand-icon'
import { StreamlinePlumpModule } from './icon'
import { useBucketStore } from '@renderer/stores/bucket-store'
import { useNavigationStore } from '@renderer/stores/navigation-store'

// Active indicator component - green color, positioned at sidebar edge
function ActiveIndicator({ className }: { className?: string }) {
  return (
    <motion.div
      layoutId="sidebar-indicator"
      className={cn(
        'absolute -left-2 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-active-indicator',
        className
      )}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    />
  )
}

// Custom menu button styles
const menuButtonStyles = cn(
  // Reset shadcn default active/hover styles
  'data-active:bg-white data-active:dark:bg-[#2a2a2a] data-active:shadow-sm data-active:text-foreground rounded-md group',
  'hover:bg-white/90 ',
  'active:bg-white/90 '
)

// Toggle sidebar button component
function ToggleSidebarButton() {
  const { toggleSidebar, state } = useSidebar()
  const isExpanded = state === 'expanded'

  return (
    <SidebarMenuButton
      tooltip="Toggle Sidebar"
      onClick={toggleSidebar}
      className={menuButtonStyles}
    >
      <IconLayoutSidebar size={18} />
      <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
    </SidebarMenuButton>
  )
}

// App brand component - icon stays in place, only sidebar width changes
function AppBrand() {
  return (
    <SidebarMenu>
      <SidebarMenuItem className="relative">
        <SidebarMenuButton
          asChild
          className={cn(menuButtonStyles, 'hover:bg-transparent active:bg-transparent cursor-none')}
        >
          <Link to={MENU_ITEMS.dashboard.path}>
            <StreamlinePlumpModule />
            <span className="font-bold">Open Uploader</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

// Maximum number of providers to show in sidebar
const MAX_RECENT_PROVIDERS = 5

export function AppSidebar() {
  const [addProviderOpen, setAddProviderOpen] = useState(false)
  const [openProviders, setOpenProviders] = useState<Record<string, boolean>>({})
  const { data: providers, isLoading } = trpc.provider.list.useQuery()
  const router = useRouterState()
  const currentPath = router.location.pathname

  // Bucket store for recent buckets
  const { recentBuckets } = useBucketStore()

  // Navigation store
  const { setProvider } = useNavigationStore()

  const isProviderActive = (providerId: string) => {
    return currentPath.includes(`/providers/${providerId}`)
  }

  const isDashboardActive = currentPath === '/'
  const isUploadHistoryActive = currentPath.startsWith('/my-uploads')
  const isProvidersActive = currentPath === '/providers'
  const isSettingsActive = currentPath.startsWith('/settings')

  // Find active provider
  const activeProviderId = providers?.find((p) => isProviderActive(p.id))?.id

  // Get recent providers (limit to MAX_RECENT_PROVIDERS)
  const recentProviders = providers?.slice(0, MAX_RECENT_PROVIDERS) ?? []
  return (
    <>
      <Sidebar collapsible="icon" className="!border-none">
        {/* Header with App Brand */}
        <SidebarHeader
          className={cn(
            window.api.platform.isMac ? 'pt-6 draggable' : '',
            'bg-[#f2f8f3bf] dark:bg-[#1E1F22] border-b border-[#f2f8f7bf] dark:border-[#333333]'
          )}
        >
          {/* App Brand */}
          <AppBrand />
        </SidebarHeader>

        <SidebarContent className="bg-[#f2f8f3bf] dark:bg-[#1E1F22]">
          {/* Main Navigation */}
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem className="relative">
                {isDashboardActive && <ActiveIndicator />}
                <SidebarMenuButton
                  asChild
                  tooltip={MENU_ITEMS.dashboard.label}
                  isActive={isDashboardActive}
                  className={menuButtonStyles}
                >
                  <Link to={MENU_ITEMS.dashboard.path}>
                    <MENU_ITEMS.dashboard.icon size={18} />
                    <span>{MENU_ITEMS.dashboard.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem className="relative">
                {isProvidersActive && <ActiveIndicator />}
                <SidebarMenuButton
                  asChild
                  tooltip={MENU_ITEMS.providers.label}
                  isActive={isProvidersActive}
                  className={menuButtonStyles}
                >
                  <Link to={MENU_ITEMS.providers.path}>
                    <MENU_ITEMS.providers.icon size={18} />
                    <span>{MENU_ITEMS.providers.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem className="relative">
                {isUploadHistoryActive && <ActiveIndicator />}
                <SidebarMenuButton
                  asChild
                  tooltip={MENU_ITEMS.uploadHistory.label}
                  isActive={isUploadHistoryActive}
                  className={menuButtonStyles}
                >
                  <Link to={MENU_ITEMS.uploadHistory.path}>
                    <MENU_ITEMS.uploadHistory.icon size={18} />
                    <span>{MENU_ITEMS.uploadHistory.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          <SidebarSeparator className="!w-auto" />

          {/* Recent Providers */}
          <SidebarGroup className="flex-1">
            <SidebarGroupLabel>Recent Providers</SidebarGroupLabel>
            <SidebarMenu>
              {isLoading ? (
                <>
                  <SidebarMenuSkeleton showIcon />
                  <SidebarMenuSkeleton showIcon />
                </>
              ) : (
                recentProviders.map((provider) => {
                  const iconKey = getProviderIconKey(provider)
                  const isActive = provider.id === activeProviderId
                  const showProviderIndicator = isActive

                  // Get recent buckets for this provider
                  const providerBuckets = recentBuckets
                    .filter((b) => b.providerId === provider.id)
                    .slice(0, 3) // Show max 3 buckets per provider
                  const canToggleBuckets = providerBuckets.length > 0
                  const isOpen = openProviders[provider.id] ?? isActive

                  return (
                    <SidebarMenuItem key={provider.id} className="relative">
                      {showProviderIndicator && (
                        <ActiveIndicator
                          className={cn(
                            providerBuckets.length > 0 &&
                              isOpen &&
                              'h-full top-1 bottom-2 translate-y-0'
                          )}
                        />
                      )}

                      <div
                        className={cn(
                          'rounded-md transition-colors',
                          isOpen && 'bg-white/70 dark:bg-[#2a2a2a] shadow-sm'
                        )}
                      >
                        <div className="flex items-center">
                          <SidebarMenuButton
                            asChild
                            tooltip={provider.name}
                            isActive={isActive}
                            className={cn(
                              menuButtonStyles,
                              canToggleBuckets && 'data-active:shadow-none'
                            )}
                          >
                            <Link to="/providers/$providerId" params={{ providerId: provider.id }}>
                              <ProviderBrandIcon
                                iconKey={iconKey}
                                size={20}
                                showBackground={false}
                              />
                              <span className="flex-1 truncate">{provider.name}</span>
                              {canToggleBuckets && (
                                <button
                                  type="button"
                                  aria-label={
                                    isOpen ? 'Collapse provider buckets' : 'Expand provider buckets'
                                  }
                                  className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition group-hover:text-foreground hover:bg-white/70 dark:hover:bg-[#2a2a2a]"
                                  onClick={(event) => {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    setOpenProviders((prev) => ({
                                      ...prev,
                                      [provider.id]: !(prev[provider.id] ?? isActive)
                                    }))
                                  }}
                                >
                                  <IconChevronDown
                                    size={16}
                                    className={cn('transition-transform', isOpen && 'rotate-180')}
                                  />
                                </button>
                              )}
                            </Link>
                          </SidebarMenuButton>
                        </div>

                        {/* Recent Buckets Submenu */}
                        {providerBuckets.length > 0 && isOpen && (
                          <SidebarMenuSub className="bg-white/70 dark:bg-[#2a2a2a] rounded-md py-1">
                            {providerBuckets.map((bucket) => {
                              const isActive = currentPath.includes(
                                `/providers/${provider.id}/${bucket.bucketName}`
                              )
                              return (
                                <SidebarMenuSubItem
                                  key={`${bucket.providerId}-${bucket.bucketName}`}
                                  className={cn('relative', isActive && 'bg-accent rounded-md')}
                                >
                                  <SidebarMenuSubButton
                                    asChild
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      setProvider({
                                        id: provider.id,
                                        name: provider.name
                                      })
                                    }}
                                  >
                                    <Link
                                      to="/providers/$providerId/$bucketName"
                                      params={{
                                        providerId: provider.id,
                                        bucketName: bucket.bucketName
                                      }}
                                    >
                                      <IconFolder size={16} />
                                      <span>{bucket.bucketName}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              )
                            })}
                          </SidebarMenuSub>
                        )}
                      </div>
                    </SidebarMenuItem>
                  )
                })
              )}

              {/* Add Provider Button */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Add Provider"
                  onClick={() => setAddProviderOpen(true)}
                  className={cn(menuButtonStyles, 'text-muted-foreground')}
                >
                  <IconPlus size={18} />
                  <span>Add Provider</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        {/* Settings and Toggle at bottom */}
        <SidebarFooter className="bg-[#f2f8f3bf] dark:bg-[#1E1F22]">
          <SidebarMenu>
            {/* Toggle Sidebar Button */}
            <SidebarMenuItem>
              <ToggleSidebarButton />
            </SidebarMenuItem>

            {/* Settings */}
            <SidebarMenuItem className="relative">
              {isSettingsActive && <ActiveIndicator />}
              <SidebarMenuButton
                asChild
                tooltip={MENU_ITEMS.settings.label}
                isActive={isSettingsActive}
                className={menuButtonStyles}
              >
                <Link to={MENU_ITEMS.settings.path}>
                  <MENU_ITEMS.settings.icon size={18} />
                  <span>{MENU_ITEMS.settings.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* Add Provider Dialog */}
      <AddProviderDialog open={addProviderOpen} onOpenChange={setAddProviderOpen} />
    </>
  )
}
