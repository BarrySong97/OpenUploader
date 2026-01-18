import { createFileRoute } from '@tanstack/react-router'
import { Switch } from '@/components/ui/switch'
import { useBucketStore } from '@renderer/stores/bucket-store'

export const Route = createFileRoute('/settings/')({
  component: SettingsIndex
})

function SettingsIndex() {
  const { settings, updateSettings } = useBucketStore()

  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold">Overview</h2>
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 font-medium">General</h3>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium">Auto-open last bucket</div>
              <div className="text-xs text-muted-foreground">
                When enabled, the app opens the last visited bucket on launch.
              </div>
            </div>
            <Switch
              checked={settings.autoOpenLastBucket}
              onCheckedChange={(checked) => updateSettings({ autoOpenLastBucket: checked })}
              aria-label="Auto-open last bucket"
            />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-2 font-medium">Application Info</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Version:</span>
              <span>1.0.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
