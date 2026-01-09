import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { IconPlus, IconPencil, IconTrash } from '@tabler/icons-react'
import { useProviders } from '@/contexts/provider-context'
import { ProviderAvatar } from '@/components/provider/provider-avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import type { Provider } from '@/lib/types'

export const Route = createFileRoute('/settings/providers')({
  component: ProvidersSettings
})

function ProvidersSettings() {
  const { providers, deleteProvider } = useProviders()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [providerToDelete, setProviderToDelete] = useState<Provider | null>(null)

  const handleDeleteClick = (provider: Provider) => {
    setProviderToDelete(provider)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (providerToDelete) {
      deleteProvider(providerToDelete.id)
      setDeleteDialogOpen(false)
      setProviderToDelete(null)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Providers</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your cloud storage providers
          </p>
        </div>
        <Button>
          <IconPlus size={18} className="mr-2" />
          Add Provider
        </Button>
      </div>

      {providers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 p-12 text-center">
          <p className="mb-4 text-muted-foreground">No providers configured</p>
          <Button>
            <IconPlus size={18} className="mr-2" />
            Add Your First Provider
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-center gap-4">
                <ProviderAvatar type={provider.type} size="sm" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{provider.name}</span>
                    <Badge variant={provider.connected ? 'default' : 'secondary'} className="text-xs">
                      {provider.connected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {provider.bucket} · {provider.region}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="default">
                  <IconPencil size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="default"
                  onClick={() => handleDeleteClick(provider)}
                >
                  <IconTrash size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Provider</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{providerToDelete?.name}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
