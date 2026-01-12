import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  IconPlus,
  IconCloud,
  IconFolder,
  IconWorld
} from '@tabler/icons-react'
import { type S3Variant } from '@renderer/db'
import { EmptyState } from '@/components/provider/empty-state'
import { AddProviderDialog } from '@/components/provider/add-provider-dialog'
import { ProviderCard } from '@/components/provider/provider-card'
import { AddProviderCard } from '@/components/provider/add-provider-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@renderer/lib/trpc'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/dashboard/status-card'
import { PageLayout } from '@/components/layout/page-layout'

export const Route = createFileRoute('/')({
  component: Index
})

function Index() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<S3Variant | undefined>()
  const { data: providers, isLoading } = trpc.provider.list.useQuery()
  const { data: globalStats } = trpc.provider.getGlobalStats.useQuery()

  const handleAddProvider = (variant?: S3Variant) => {
    setSelectedVariant(variant)
    setDialogOpen(true)
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setSelectedVariant(undefined)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <PageLayout>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-64" />
            <Skeleton className="mt-2 h-5 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div>
          <Skeleton className="mb-4 h-7 w-40" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Skeleton className="h-32 rounded-md" />
            <Skeleton className="h-32 rounded-md" />
          </div>
        </div>
      </PageLayout>
    )
  }

  // Empty state - show onboarding
  if (!providers || providers.length === 0) {
    return (
      <PageLayout>
        <EmptyState onAddProvider={handleAddProvider} />
        <AddProviderDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          defaultVariant={selectedVariant}
        />
      </PageLayout>
    )
  }

  // Has providers - show list
  return (
    <PageLayout>
      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Providers"
          value={String(globalStats?.providersCount ?? 0)}
          icon={<IconCloud size={20} />}
        />
        <StatCard
          title="Buckets"
          value={String(globalStats?.bucketsCount ?? 0)}
          icon={<IconFolder size={20} />}
        />
        <StatCard
          title="Regions"
          value={String(globalStats?.regionsCount ?? 0)}
          icon={<IconWorld size={20} />}
        />
      </div>

      {/* Connected Providers */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-xl font-semibold">Connected Providers</h2>
          <Badge variant="secondary" className="rounded-full">
            {providers.length}
          </Badge>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} />
          ))}
          <AddProviderCard onClick={() => handleAddProvider()} />
        </div>
      </div>

      <AddProviderDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        defaultVariant={selectedVariant}
      />
    </PageLayout>
  )
}
