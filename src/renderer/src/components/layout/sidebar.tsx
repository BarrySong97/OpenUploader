import { useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { IconPlus } from '@tabler/icons-react'
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
  SidebarSeparator,
  useSidebar
} from '@/components/ui/sidebar'
import { IconLayoutSidebar } from '@tabler/icons-react'
import { AddProviderDialog } from '@/components/provider/add-provider-dialog'
import { MENU_ITEMS } from '@renderer/constants/menu'
import { ProviderBrandIcon, getProviderIconKey } from '@/components/provider/brand-icon'
import { StreamlinePlumpModule } from './icon'

// Active indicator component - green color, positioned at sidebar edge
function ActiveIndicator() {
  return (
    <motion.div
      layoutId="sidebar-indicator"
      className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-[#20a64b]"
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    />
  )
}

// Custom menu button styles
const menuButtonStyles = cn(
  // Reset shadcn default active/hover styles
  'data-active:bg-white data-active:dark:bg-[#2a2a2a] data-active:shadow-sm data-active:text-foreground rounded-md',
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
            <span className="font-bold">DING</span>
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
  const { data: providers, isLoading } = trpc.provider.list.useQuery()
  const router = useRouterState()
  const currentPath = router.location.pathname

  const isProviderActive = (providerId: string) => {
    return currentPath.includes(`/provider/${providerId}`)
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

                  return (
                    <SidebarMenuItem key={provider.id} className="relative">
                      {isActive && <ActiveIndicator />}
                      <SidebarMenuButton
                        asChild
                        tooltip={provider.name}
                        isActive={isActive}
                        className={menuButtonStyles}
                      >
                        <Link to="/provider/$providerId" params={{ providerId: provider.id }}>
                          <ProviderBrandIcon iconKey={iconKey} size={20} showBackground={false} />
                          <span>{provider.name}</span>
                        </Link>
                      </SidebarMenuButton>
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
