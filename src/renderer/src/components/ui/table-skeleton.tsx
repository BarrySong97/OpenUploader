import * as React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

export interface TableSkeletonColumn {
  /** Header content - can be a string or React node (e.g., Skeleton for checkbox) */
  header: React.ReactNode
  /** Optional width class (e.g., "w-12", "w-24") */
  width?: string
  /** Cell skeleton content */
  cell: React.ReactNode
  /** Text alignment */
  align?: 'left' | 'right'
}

export interface TableSkeletonProps {
  /** Column definitions */
  columns: TableSkeletonColumn[]
  /** Number of skeleton rows to render (default: 5) */
  rows?: number
  /** Optional footer content (e.g., pagination skeleton) */
  footer?: React.ReactNode
}

export function TableSkeleton({ columns, rows = 5, footer }: TableSkeletonProps) {
  return (
    <div className="space-y-0">
      <div className={cn('rounded-md border', footer && 'rounded-b-none')}>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {columns.map((col, index) => (
                <TableHead
                  key={index}
                  className={cn(
                    'text-xs font-semibold uppercase tracking-wider text-muted-foreground',
                    col.width,
                    col.align === 'right' && 'text-right'
                  )}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((col, colIndex) => (
                  <TableCell
                    key={colIndex}
                    className={cn(col.width, col.align === 'right' && 'text-right')}
                  >
                    {col.cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {footer && (
        <div className="flex items-center justify-between rounded-b-md border-x border-b px-4 py-3">
          {footer}
        </div>
      )}
    </div>
  )
}

// Pre-configured skeleton for BucketTable
export function BucketTableSkeleton() {
  return (
    <TableSkeleton
      columns={[
        {
          header: 'BUCKET NAME',
          cell: (
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
            </div>
          )
        },
        {
          header: 'CREATED DATE',
          cell: <Skeleton className="h-4 w-24" />
        },
        {
          header: 'ACTIONS',
          width: 'w-32',
          align: 'right',
          cell: <Skeleton className="ml-auto h-7 w-7" />
        }
      ]}
      rows={5}
      footer={<Skeleton className="h-4 w-40" />}
    />
  )
}

// Pre-configured skeleton for FileList (bucket browser)
export function FileListSkeleton() {
  return (
    <TableSkeleton
      columns={[
        {
          header: <Skeleton className="h-4 w-4" />,
          width: 'w-12',
          cell: <Skeleton className="h-4 w-4" />
        },
        {
          header: 'NAME',
          cell: (
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-48" />
            </div>
          )
        },
        {
          header: 'SIZE',
          cell: <Skeleton className="h-4 w-16" />
        },
        {
          header: 'LAST MODIFIED',
          cell: <Skeleton className="h-4 w-24" />
        },
        {
          header: '',
          width: 'w-24',
          cell: null
        }
      ]}
      rows={8}
    />
  )
}

// Pre-configured skeleton for upload history table
export function UploadHistoryTableSkeleton() {
  return (
    <TableSkeleton
      columns={[
        {
          header: <Skeleton className="h-4 w-4" />,
          width: 'w-10',
          cell: <Skeleton className="h-4 w-4" />
        },
        {
          header: 'Name',
          cell: (
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-4 w-48" />
            </div>
          )
        },
        {
          header: 'Bucket',
          cell: <Skeleton className="h-4 w-24" />
        },
        {
          header: 'Size',
          cell: <Skeleton className="h-4 w-16" />
        },
        {
          header: 'Status',
          cell: <Skeleton className="h-6 w-24" />
        },
        {
          header: 'Uploaded',
          cell: <Skeleton className="h-4 w-32" />
        },
        {
          header: '',
          width: 'w-24',
          cell: <Skeleton className="h-7 w-16" />
        }
      ]}
      rows={10}
    />
  )
}
