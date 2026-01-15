import { useState } from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable
} from '@tanstack/react-table'
import { IconFolder, IconTrash } from '@tabler/icons-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'

export { BucketTableSkeleton } from '@/components/ui/table-skeleton'

export interface BucketInfo {
  name: string
  creationDate?: string
}

interface BucketTableProps {
  buckets: BucketInfo[]
  onBucketClick?: (bucket: BucketInfo) => void
  onBucketDelete?: (bucket: BucketInfo) => void
  pageSize?: number
}

export function BucketTable({
  buckets,
  onBucketClick,
  onBucketDelete,
  pageSize = 10
}: BucketTableProps) {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize
  })

  const columns: ColumnDef<BucketInfo>[] = [
    {
      accessorKey: 'name',
      header: 'BUCKET NAME',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <IconFolder size={16} className="text-muted-foreground" />
          <span className="font-medium">{row.getValue('name')}</span>
        </div>
      )
    },
    {
      accessorKey: 'creationDate',
      header: 'CREATED DATE',
      cell: ({ row }) => {
        const date = row.getValue('creationDate') as string | undefined
        if (!date) return <span className="text-muted-foreground">—</span>
        return (
          <span className="text-muted-foreground">
            {new Date(date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </span>
        )
      }
    },
    {
      id: 'actions',
      header: () => <div className="text-right">ACTIONS</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
            onClick={(e) => {
              e.stopPropagation()
              onBucketDelete?.(row.original)
            }}
          >
            <IconTrash size={16} />
          </Button>
        </div>
      )
    }
  ]

  const table = useReactTable({
    data: buckets,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      pagination
    },
    onPaginationChange: setPagination
  })

  const totalPages = table.getPageCount()
  const totalItems = buckets.length
  const startItem = pagination.pageIndex * pagination.pageSize + 1
  const endItem = Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalItems)

  return (
    <div className="space-y-0">
      <div className="rounded-b-none rounded-t-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/50">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="group cursor-pointer"
                  onClick={() => onBucketClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No buckets found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalItems > 0 && (
        <div className="flex items-center justify-between border-x border-b px-4 py-3 rounded-b-md">
          <span className="text-xs text-muted-foreground">
            Showing {startItem}-{endItem} of {totalItems} buckets
          </span>
          {totalPages > 1 && (
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Previous page</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Next page</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
