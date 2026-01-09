import { createFileRoute } from '@tanstack/react-router'
import { useProviders } from '@/contexts/provider-context'

export const Route = createFileRoute('/settings/')({
  component: SettingsIndex
})

function SettingsIndex() {
  const { providers } = useProviders()

  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold">Overview</h2>
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-2 font-medium">Application Info</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Version:</span>
              <span>1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>Configured Providers:</span>
              <span>{providers.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
