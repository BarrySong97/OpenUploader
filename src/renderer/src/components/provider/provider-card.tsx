import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { IconChevronRight, IconDotsVertical } from '@tabler/icons-react'
import type { TRPCProvider } from '@renderer/lib/trpc'
import { trpc } from '@renderer/lib/trpc'
import { useProviderStatus } from '@renderer/hooks/use-provider-status'
import { cn } from '@/lib/utils'
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
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { ProviderSettingsDialog } from './provider-settings-dialog'
import { ProviderBrandIcon, getProviderIconKey } from './brand-icon'

interface ProviderCardProps {
  provider: TRPCProvider
}

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

function formatLastOperation(date: Date | string | null | undefined): string {
  if (!date) return 'Never'

  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = now.getTime() - dateObj.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`

  return dateObj.toLocaleDateString()
}

export function ProviderCard({ provider }: ProviderCardProps) {
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

  const statusText = isLoading ? 'Checking...' : isConnected ? 'Connected' : 'Paused'

  const handleDelete = () => {
    deleteMutation.mutate({ id: provider.id })
    setDeleteDialogOpen(false)
  }

  const iconKey = getProviderIconKey(provider)

  return (
    <>
      <Link to="/provider/$providerId" params={{ providerId: provider.id }} className="block group">
        <div className="relative rounded-md border border-border bg-white dark:bg-[#1E1E1E] p-4 transition-colors hover:bg-accent/30">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ProviderBrandIcon iconKey={iconKey} size={24} />
              <div>
                <div className="font-medium">{provider.name}</div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <span
                    className={cn(
                      'inline-block h-1.5 w-1.5 rounded-full',
                      isLoading
                        ? 'bg-yellow-500 animate-pulse'
                        : isConnected
                          ? 'bg-green-500'
                          : 'bg-muted-foreground'
                    )}
                  />
                  <span>{statusText}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-mono">
                {region || 'Region:auto'}
              </span>
              <IconChevronRight size={16} />
            </div>
          </div>

          {/* Divider */}
          <div className="my-8 h-px bg-border/50" />

          {/* Stats */}
          <div className="flex gap-8">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Provider
              </div>
              <div className="mt-0.5 text-lg font-semibold">{getProviderTypeLabel(provider)}</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Buckets
              </div>
              <div className="mt-0.5 text-lg font-semibold">{stats?.bucketCount ?? 0}</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Last Operation
              </div>
              <div className="mt-0.5 text-lg font-semibold">
                {formatLastOperation(provider.lastOperationAt)}
              </div>
            </div>
          </div>

          {/* Dropdown Menu - appears on hover */}
          <div className="absolute bottom-4 right-4 opacity-0 transition-opacity group-hover:opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => e.preventDefault()}
                >
                  <IconDotsVertical size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault()
                    setSettingsOpen(true)
                  }}
                >
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={(e) => {
                    e.preventDefault()
                    setDeleteDialogOpen(true)
                  }}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Link>

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
