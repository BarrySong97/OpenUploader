import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

interface UpdateInfo {
  version: string
  releaseNotes?: string
}

interface ProgressInfo {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}

export function GlobalAutoUpdateChecker() {
  const updateInfoRef = useRef<UpdateInfo | null>(null)

  // 只在生产环境下启用自动更新
  const isProduction = import.meta.env.VITE_APP_ENV === 'prod'

  useEffect(() => {
    // 如果不是生产环境，不启用更新功能
    if (!isProduction) {
      console.log('Auto-update disabled: not in production environment')
      return
    }

    // 监听更新事件
    const unsubChecking = window.api.updater.onUpdateChecking(() => {
      console.log('Checking for updates...')
    })

    const unsubAvailable = window.api.updater.onUpdateAvailable((info) => {
      console.log('Update available:', info)
      updateInfoRef.current = info

      // 显示更新可用通知
      toast.info(`New version ${info.version} available`, {
        description: 'Click Download to install the update',
        duration: Infinity, // 不自动关闭
        action: {
          label: 'Download',
          onClick: () => {
            // 用户点击后开始下载
            window.api.updater.downloadUpdate()
            toast.loading('Starting download...', {
              id: 'update-download-progress',
              description: `Version ${info.version}`
            })
          }
        },
        cancel: {
          label: 'Later',
          onClick: () => {
            // 用户选择稍后更新
          }
        }
      })
    })

    const unsubNotAvailable = window.api.updater.onUpdateNotAvailable(() => {
      console.log('No updates available')
    })

    const unsubProgress = window.api.updater.onDownloadProgress((progressInfo: ProgressInfo) => {
      // 显示下载进度（更新现有 toast）
      if (progressInfo.percent < 100) {
        toast.loading(`Downloading update: ${Math.round(progressInfo.percent)}%`, {
          id: 'update-download-progress',
          description: `Version ${updateInfoRef.current?.version || 'latest'}`
        })
      }
    })

    const unsubDownloaded = window.api.updater.onUpdateDownloaded((info) => {
      console.log('Update downloaded:', info)

      // 关闭下载进度 toast
      toast.dismiss('update-download-progress')

      // 显示更新就绪通知
      toast.success('Update ready to install', {
        description: `Version ${info.version} has been downloaded`,
        duration: Infinity,
        action: {
          label: 'Restart Now',
          onClick: () => {
            window.api.updater.installUpdate()
          }
        },
        cancel: {
          label: 'Later',
          onClick: () => {
            // 用户选择稍后重启
          }
        }
      })
    })

    const unsubError = window.api.updater.onUpdateError((error) => {
      console.error('Update error:', error)

      // 关闭下载进度 toast
      toast.dismiss('update-download-progress')

      // 显示错误通知
      toast.error('Update failed', {
        description: error.message || 'Failed to download update'
      })
    })

    return () => {
      unsubChecking()
      unsubAvailable()
      unsubNotAvailable()
      unsubProgress()
      unsubDownloaded()
      unsubError()
    }
  }, [isProduction])

  // 这个组件不渲染任何 UI，只负责监听更新事件并显示 toast
  return null
}
