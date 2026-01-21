import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { IconRefresh } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

export const Route = createFileRoute('/settings/')({
  component: SettingsIndex
})

function SettingsIndex() {
  const [checking, setChecking] = useState(false)
  const [version, setVersion] = useState('...')

  // 只在生产环境下显示更新功能
  const isProduction = import.meta.env.VITE_APP_ENV === 'prod'

  // 获取应用版本号
  useEffect(() => {
    window.api
      .getAppVersion()
      .then(setVersion)
      .catch(() => setVersion('Unknown'))
  }, [])

  const handleCheckForUpdates = async () => {
    setChecking(true)
    try {
      const result = await window.api.updater.checkForUpdates()
      console.log(result)
      toast({
        title: 'Update Check Failed',
        description: JSON.stringify(result),
        variant: 'destructive'
      })
      if (result.error) {
        // 检查失败
        toast({
          title: 'Update Check Failed',
          description: result.error,
          variant: 'destructive'
        })
      } else if (result.updateInfo) {
        // 有新版本
        toast({
          title: 'Update Available',
          description: `Version ${result.updateInfo.version} is available`
        })
      } else if (result.success) {
        // 没有新版本（检查成功但没有更新）
        toast({
          title: 'No Updates Available',
          description: 'You are already running the latest version'
        })
      } else {
        // 未知情况
        toast({
          title: 'No Updates',
          description: 'You are running the latest version'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to check for updates',
        variant: 'destructive'
      })
    } finally {
      setChecking(false)
    }
  }

  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold">Overview</h2>
      <div className="space-y-4">
        <div className="rounded-md border border-border bg-card p-6">
          <h3 className="mb-2 font-medium">Application Info</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Version:</span>
              <span>{version}</span>
            </div>
          </div>

          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheckForUpdates}
              disabled={checking}
            >
              <IconRefresh className={cn('mr-2 h-4 w-4', checking && 'animate-spin')} />
              {checking ? 'Checking...' : 'Check for Updates'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
