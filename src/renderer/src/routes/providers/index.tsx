import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { IconPencil, IconTrash, IconPlus } from '@tabler/icons-react'
import { type ProviderType } from '@renderer/db'
import type { TRPCProvider } from '@renderer/lib/trpc'
import { trpc } from '@renderer/lib/trpc'
import { useProviderStatus } from '@renderer/hooks/use-provider-status'
import { cn } from '@/lib/utils'
import { AddProviderDialog } from '@/components/provider/add-provider-dialog'
import { ProviderSettingsDialog } from '@/components/provider/provider-settings-dialog'
import { ProviderBrandIcon, getProviderIconKey } from '@/components/provider/brand-icon'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
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
import { PageLayout } from '@/components/layout/page-layout'

export const Route = createFileRoute('/providers/')({
  component: ProvidersPage
})

const providerTypeLabels: Record<string, string> = {
  'aws-s3': 'AWS S3',
  'cloudflare-r2': 'Cloudflare R2',
  minio: 'MinIO',
  'aliyun-oss': 'Aliyun OSS',
  'tencent-cos': 'Tencent COS',
  supabase: 'Supabase Storage'
}

function getProviderTypeLabel(provider: TRPCProvider): string {
  return providerTypeLabels[provider.type] || provider.type
}

interface ProviderRowProps {
  provider: TRPCProvider
}

function ProviderRow({ provider }: ProviderRowProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const { isLoading, isConnected, stats } = useProviderStatus(provider)
  const utils = trpc.useUtils()

  const deleteMutation = trpc.provider.delete.useMutation({
    onSuccess: () => {
      utils.provider.list.invalidate()
    }
  })

  const region =
    provider.type === 'supabase' && provider.projectUrl
      ? new URL(provider.projectUrl).hostname
      : 'region' in provider
        ? provider.region
        : undefined

  const statusText = isLoading ? 'Checking...' : isConnected ? 'Connected' : 'Disconnected'

  const handleDelete = () => {
    deleteMutation.mutate({ id: provider.id })
    setDeleteDialogOpen(false)
  }

  const iconKey = getProviderIconKey(provider)

  return (
    <>
      <TableRow className="group">
        <TableCell>
          <Link
            to="/providers/$providerId"
            params={{ providerId: provider.id }}
            className="flex items-center gap-3"
          >
            <ProviderBrandIcon iconKey={iconKey} size={24} />
            <div>
              <div className="font-medium">{provider.name}</div>
              <div className="text-sm text-muted-foreground">{region || 'auto'}</div>
            </div>
          </Link>
        </TableCell>
        <TableCell>{getProviderTypeLabel(provider)}</TableCell>
        <TableCell>{stats?.bucketCount ?? '-'}</TableCell>
        <TableCell>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'inline-block h-2 w-2 rounded-full',
                isLoading
                  ? 'bg-yellow-500 animate-pulse'
                  : isConnected
                    ? 'bg-green-500'
                    : 'bg-muted-foreground'
              )}
            />
            <span className="text-sm">{statusText}</span>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSettingsOpen(true)}
            >
              <IconPencil size={16} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <IconTrash size={16} />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      <ProviderSettingsDialog
        provider={provider}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Provider</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{provider.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function ProvidersPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<ProviderType | undefined>()
  const { data: providers, isLoading } = trpc.provider.list.useQuery()

  const handleAddProvider = (type?: ProviderType) => {
    setSelectedType(type)
    setDialogOpen(true)
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setSelectedType(undefined)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <PageLayout>
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Buckets</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3].map((i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-md" />
                      <div>
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-8" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-16" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Providers</h2>
        <Button onClick={() => handleAddProvider()}>
          <IconPlus size={16} />
          Add Provider
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Buckets</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {providers?.map((provider) => (
              <ProviderRow key={provider.id} provider={provider} />
            ))}
          </TableBody>
        </Table>
      </div>

      <AddProviderDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        defaultType={selectedType}
      />
    </PageLayout>
  )
}
