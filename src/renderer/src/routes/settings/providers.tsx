import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { IconPlus, IconPencil, IconTrash, IconCloud } from '@tabler/icons-react'
import { AddProviderDialog } from '@/components/provider/add-provider-dialog'
import { Button } from '@/components/ui/button'
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
import { trpc, type TRPCProvider } from '@renderer/lib/trpc'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/settings/providers')({
  component: ProvidersSettings
})

function ProvidersSettings() {
  const { data: providers, isLoading } = trpc.provider.list.useQuery()
  const utils = trpc.useUtils()
  const deleteMutation = trpc.provider.delete.useMutation({
    onSuccess: () => {
      utils.provider.list.invalidate()
    }
  })
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [providerToDelete, setProviderToDelete] = useState<TRPCProvider | null>(null)

  const handleDeleteClick = (provider: TRPCProvider) => {
    setProviderToDelete(provider)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (providerToDelete) {
      deleteMutation.mutate({ id: providerToDelete.id })
      setDeleteDialogOpen(false)
      setProviderToDelete(null)
    }
  }

  const getProviderTypeLabel = (provider: TRPCProvider) => {
    if (provider.type === 's3-compatible') {
      const labels: Record<string, string> = {
        'aws-s3': 'AWS S3',
        'aliyun-oss': 'Aliyun OSS',
        'tencent-cos': 'Tencent COS',
        'cloudflare-r2': 'Cloudflare R2',
        minio: 'MinIO',
        'backblaze-b2': 'Backblaze B2'
      }
      return labels[provider.variant] || provider.variant
    }
    return 'Supabase Storage'
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
        <Button onClick={() => setAddDialogOpen(true)}>
          <IconPlus size={18} className="mr-2" />
          Add Provider
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      ) : !providers || providers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 p-12 text-center">
          <p className="mb-4 text-muted-foreground">No providers configured</p>
          <Button onClick={() => setAddDialogOpen(true)}>
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
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <IconCloud size={20} className="text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{provider.name}</span>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {getProviderTypeLabel(provider)}
                    {provider.bucket && ` · ${provider.bucket}`}
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

      {/* Add Provider Dialog */}
      <AddProviderDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />

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
