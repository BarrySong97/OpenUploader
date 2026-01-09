import { createFileRoute, Link } from '@tanstack/react-router'
import { IconPlus } from '@tabler/icons-react'
import { useProviders } from '@/contexts/provider-context'
import { ProviderCard } from '@/components/provider/provider-card'
import { StatusCard } from '@/components/dashboard/status-card'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({
  component: Index
})

function Index() {
  const { providers } = useProviders()

  const totalFiles = providers.reduce((sum, p) => sum + p.stats.files, 0)
  const connectedCount = providers.filter((p) => p.connected).length

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-7xl p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">OSS Upload Client</h1>
            <p className="mt-2 text-muted-foreground">
              Manage your cloud storage providers and files
            </p>
          </div>
          <Link to="/settings/providers">
            <Button>
              <IconPlus size={18} className="mr-2" />
              Add Provider
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatusCard value={providers.length} label="Total Providers" />
          <StatusCard value={connectedCount} label="Connected" />
          <StatusCard value={totalFiles.toLocaleString()} label="Total Files" />
        </div>

        {/* Providers Grid */}
        <div>
          <h2 className="mb-4 text-xl font-semibold">Your Providers</h2>
          {providers.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 p-12 text-center">
              <p className="mb-4 text-muted-foreground">No providers configured yet</p>
              <Link to="/settings/providers">
                <Button>
                  <IconPlus size={18} className="mr-2" />
                  Add Your First Provider
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {providers.map((provider) => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
