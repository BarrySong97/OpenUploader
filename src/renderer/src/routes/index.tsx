import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { IconPlus } from '@tabler/icons-react'
import { type S3Variant } from '@renderer/db'
import { EmptyState } from '@/components/provider/empty-state'
import { AddProviderDialog } from '@/components/provider/add-provider-dialog'
import { ProviderCard } from '@/components/provider/provider-card'
import { Button } from '@/components/ui/button'
import { trpc } from '@renderer/lib/trpc'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/')({
  component: Index
})

function Index() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<S3Variant | undefined>()
  const { data: providers, isLoading } = trpc.provider.list.useQuery()

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
      <div className="h-full overflow-auto">
        <div className="mx-auto p-8">
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
        </div>
      </div>
    )
  }

  // Empty state - show onboarding
  if (!providers || providers.length === 0) {
    return (
      <>
        <EmptyState onAddProvider={handleAddProvider} />
        <AddProviderDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          defaultVariant={selectedVariant}
        />
      </>
    )
  }

  // Has providers - show list
  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">OSS Upload Client</h1>
            <p className="mt-2 text-muted-foreground">
              Manage your cloud storage providers and files
            </p>
          </div>
          <Button onClick={() => handleAddProvider()}>
            <IconPlus size={18} className="mr-2" />
            Add Provider
          </Button>
        </div>

        {/* Providers Grid */}
        <div>
          <h2 className="mb-4 text-xl font-semibold">Your Providers</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {providers.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        </div>
      </div>

      <AddProviderDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        defaultVariant={selectedVariant}
      />
    </div>
  )
}
