import { Link, useRouterState } from '@tanstack/react-router'
import { IconCloud, IconBrandAws, IconFolder, IconFolderOpen } from '@tabler/icons-react'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import { useNavigationStore } from '@renderer/stores/navigation-store'
import { findMenuItemByPath } from '@renderer/constants/menu'
import { cn } from '@renderer/lib/utils'

// Provider icon based on variant
function getProviderIcon(variant?: string) {
  if (variant === 'aws-s3') {
    return IconBrandAws
  }
  return IconCloud
}

// 面包屑项样式
const linkStyle =
  'flex items-center gap-2 text-gray-500  hover:bg-accent rounded-md transition-colors no-draggable cursor-pointer px-2 py-0.5 rounded-md'
const badgeStyle =
  'flex items-center gap-2 bg-white px-2 py-0.5  no-draggable cursor-pointer hover:bg-accent rounded-md transition-colors'
const activeTextStyle = 'text-gray-900 '

export function Header() {
  const router = useRouterState()
  const currentPath = router.location.pathname

  const {
    currentProvider,
    currentBucket,
    currentPath: folderPath,
    navigateToFolder
  } = useNavigationStore()

  // 查找当前路由配置
  const findRouteConfig = (path: string) => {
    return findMenuItemByPath(path)
  }

  // 生成面包屑项
  const renderBreadcrumbs = () => {
    const items: React.ReactNode[] = []

    // 1. Dashboard
    const dashboardConfig = findRouteConfig('/')
    const isOnDashboard = currentPath === '/'

    if (isOnDashboard) {
      // Dashboard page - show as active (no background/shadow)
      items.push(
        <BreadcrumbItem key="dashboard">
          <BreadcrumbLink asChild>
            <Link to="/" className={linkStyle}>
              {dashboardConfig?.icon && <dashboardConfig.icon size={16} />}
              <span>{dashboardConfig?.label}</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
      )
      return items
    }

    // Dashboard as link (not on dashboard page)
    items.push(
      <BreadcrumbItem key="dashboard">
        <BreadcrumbLink asChild>
          <Link to="/" className={linkStyle}>
            {dashboardConfig?.icon && <dashboardConfig.icon size={16} />}
            <span>{dashboardConfig?.label}</span>
          </Link>
        </BreadcrumbLink>
      </BreadcrumbItem>
    )

    // 2. Settings 页面
    if (currentPath.startsWith('/settings')) {
      const settingsConfig = findRouteConfig('/settings')
      const isOnSettings = currentPath === '/settings'

      items.push(<BreadcrumbSeparator key="sep-settings" />)

      if (isOnSettings) {
        items.push(
          <BreadcrumbItem key="settings">
            <div className={badgeStyle}>
              {settingsConfig?.icon && <settingsConfig.icon size={16} />}
              <span className={activeTextStyle}>{settingsConfig?.label}</span>
            </div>
          </BreadcrumbItem>
        )
      } else {
        items.push(
          <BreadcrumbItem key="settings">
            <BreadcrumbLink asChild>
              <Link to="/settings" className={linkStyle}>
                {settingsConfig?.icon && <settingsConfig.icon size={16} />}
                <span>{settingsConfig?.label}</span>
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
        )

        // Settings 子页面
        const subConfig = findRouteConfig(currentPath)
        if (subConfig) {
          items.push(<BreadcrumbSeparator key="sep-sub" />)
          items.push(
            <BreadcrumbItem key="sub">
              <div className={badgeStyle}>
                {subConfig.icon && <subConfig.icon size={16} />}
                <span className={activeTextStyle}>{subConfig.label}</span>
              </div>
            </BreadcrumbItem>
          )
        }
      }

      return items
    }

    // 3. Upload History 页面
    if (currentPath.startsWith('/my-uploads')) {
      const uploadHistoryConfig = findRouteConfig('/my-uploads')

      items.push(<BreadcrumbSeparator key="sep-upload-history" />)
      items.push(
        <BreadcrumbItem key="upload-history">
          <div className={badgeStyle}>
            {uploadHistoryConfig?.icon && <uploadHistoryConfig.icon size={16} />}
            <span className={activeTextStyle}>{uploadHistoryConfig?.label}</span>
          </div>
        </BreadcrumbItem>
      )

      return items
    }

    // 4. Providers 列表页面
    if (currentPath === '/providers') {
      const providersConfig = findRouteConfig('/providers')

      items.push(<BreadcrumbSeparator key="sep-providers" />)
      items.push(
        <BreadcrumbItem key="providers">
          <div className={badgeStyle}>
            {providersConfig?.icon && <providersConfig.icon size={16} />}
            <span className={activeTextStyle}>{providersConfig?.label}</span>
          </div>
        </BreadcrumbItem>
      )

      return items
    }

    // 5. Provider 详情页面
    if (currentPath.startsWith('/provider/') && currentProvider) {
      const providersConfig = findRouteConfig('/providers')
      const ProviderIcon = getProviderIcon(currentProvider.variant)
      const isLastItem = !currentBucket

      // 先添加 Providers 链接
      items.push(<BreadcrumbSeparator key="sep-providers" />)
      items.push(
        <BreadcrumbItem key="providers">
          <BreadcrumbLink asChild>
            <Link to="/providers" className={linkStyle}>
              {providersConfig?.icon && <providersConfig.icon size={16} />}
              <span>{providersConfig?.label}</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
      )

      // 再添加 Provider 名字
      items.push(<BreadcrumbSeparator key="sep-provider" />)

      if (isLastItem) {
        // Provider 是当前页面（没有选中 bucket）
        items.push(
          <BreadcrumbItem key="provider">
            <div className={badgeStyle}>
              <ProviderIcon size={16} />
              <span className={activeTextStyle}>{currentProvider.name}</span>
            </div>
          </BreadcrumbItem>
        )
      } else {
        // Provider 作为链接（已选中 bucket）
        items.push(
          <BreadcrumbItem key="provider">
            <button
              onClick={() => {
                useNavigationStore.getState().setBucket(null)
              }}
              className={linkStyle}
            >
              <ProviderIcon size={16} />
              <span>{currentProvider.name}</span>
            </button>
          </BreadcrumbItem>
        )

        // 4. Bucket
        items.push(<BreadcrumbSeparator key="sep-bucket" />)
        const isBucketLast = folderPath.length === 0

        if (isBucketLast) {
          items.push(
            <BreadcrumbItem key="bucket">
              <div className={badgeStyle}>
                <IconFolderOpen size={16} />
                <span className={activeTextStyle}>{currentBucket}</span>
              </div>
            </BreadcrumbItem>
          )
        } else {
          items.push(
            <BreadcrumbItem key="bucket">
              <button onClick={() => navigateToFolder(-1)} className={linkStyle}>
                <IconFolderOpen size={16} />
                <span>{currentBucket}</span>
              </button>
            </BreadcrumbItem>
          )

          // 5. Folder path
          folderPath.forEach((folder, index) => {
            const isLast = index === folderPath.length - 1
            items.push(<BreadcrumbSeparator key={`sep-folder-${index}`} />)

            if (isLast) {
              items.push(
                <BreadcrumbItem key={`folder-${index}`}>
                  <div className={badgeStyle}>
                    <IconFolder size={16} />
                    <span className={activeTextStyle}>{folder}</span>
                  </div>
                </BreadcrumbItem>
              )
            } else {
              items.push(
                <BreadcrumbItem key={`folder-${index}`}>
                  <button onClick={() => navigateToFolder(index)} className={linkStyle}>
                    <IconFolder size={16} />
                    <span>{folder}</span>
                  </button>
                </BreadcrumbItem>
              )
            }
          })
        }
      }

      return items
    }

    return items
  }

  return (
    <header
      className={cn(
        'pl-4 pr-[140px] flex items-center gap-2 shrink-0 bg-white dark:bg-[#1E1F22]   dark:border-[#333333] draggable ',
        window.api.platform.isMac ? 'pt-0 h-10 ' : 'h-12'
      )}
    >
      <Breadcrumb>
        <BreadcrumbList>{renderBreadcrumbs()}</BreadcrumbList>
      </Breadcrumb>
    </header>
  )
}
