import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { PageLayout } from '@/components/layout/page-layout'
import { BucketTableSkeleton, UploadHistoryTableSkeleton } from './table-skeleton'

/**
 * Skeleton for the Providers list page
 * Used in: routes/providers/index.tsx
 */
export function ProvidersListSkeleton() {
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

/**
 * Skeleton for the Provider detail page
 * Used in: routes/providers/$providerId/index.tsx
 */
export function ProviderDetailSkeleton() {
  return (
    <PageLayout className="space-y-8">
      {/* Provider Info Card Skeleton */}
      <div className="rounded-md border bg-card p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-5">
            <Skeleton className="h-20 w-20 rounded-2xl" />
            <div>
              <Skeleton className="h-8 w-48" />
              <div className="mt-3 flex gap-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
          </div>
          <Skeleton className="h-9 w-9" />
        </div>
        <div className="mt-6 border-t pt-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 h-10 w-full" />
        </div>
      </div>

      {/* Bucket List Skeleton */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <BucketTableSkeleton />
      </section>
    </PageLayout>
  )
}

/**
 * Skeleton for the My Uploads page
 * Used in: routes/my-uploads/index.tsx
 */
export function MyUploadsPageSkeleton() {
  return (
    <PageLayout>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton className="h-24 rounded-md" />
        <Skeleton className="h-24 rounded-md" />
        <Skeleton className="h-24 rounded-md" />
      </div>
      <div>
        <Skeleton className="mb-4 h-7 w-40" />
        <UploadHistoryTableSkeleton />
      </div>
    </PageLayout>
  )
}

/**
 * Skeleton for the Dashboard/Home page
 * Used in: routes/index.tsx
 */
export function DashboardSkeleton() {
  return (
    <PageLayout>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton className="h-24 rounded-md" />
        <Skeleton className="h-24 rounded-md" />
        <Skeleton className="h-24 rounded-md" />
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

/**
 * Skeleton for Settings pages (Compression, Presets)
 * Used in: routes/settings/compression.tsx, routes/settings/presets.tsx
 */
export function SettingsPageSkeleton({ showButton = false }: { showButton?: boolean }) {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="space-y-4">
        {showButton && <Skeleton className="h-10 w-32" />}
        <Skeleton className="h-64 rounded-md" />
      </div>
    </div>
  )
}
