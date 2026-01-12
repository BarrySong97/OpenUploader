import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { IconPlus, IconEdit, IconTrash, IconCheck } from '@tabler/icons-react'
import { trpc } from '@renderer/lib/trpc'
import { Button } from '@/components/ui/button'
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
import { Skeleton } from '@/components/ui/skeleton'
import { PresetDialog } from '@/components/preset-dialog'
import type { Preset, CreatePresetInput } from '@shared/schema/settings'

export const Route = createFileRoute('/settings/presets')({
  component: PresetManagement
})

function PresetManagement() {
  const utils = trpc.useUtils()
  const { data: presets, isLoading } = trpc.preset.list.useQuery()
  const createMutation = trpc.preset.create.useMutation()
  const updateMutation = trpc.preset.update.useMutation()
  const deleteMutation = trpc.preset.delete.useMutation()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [presetToDelete, setPresetToDelete] = useState<Preset | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleCreate = () => {
    setDialogMode('create')
    setSelectedPreset(null)
    setDialogOpen(true)
  }

  const handleEdit = (preset: Preset) => {
    setDialogMode('edit')
    setSelectedPreset(preset)
    setDialogOpen(true)
  }

  const handleDeleteClick = (preset: Preset) => {
    setPresetToDelete(preset)
    setDeleteDialogOpen(true)
  }

  const handleSubmit = async (data: CreatePresetInput) => {
    try {
      if (dialogMode === 'create') {
        await createMutation.mutateAsync(data)
      } else if (selectedPreset) {
        await updateMutation.mutateAsync({
          id: selectedPreset.id,
          ...data
        })
      }
      await utils.preset.list.invalidate()
      await utils.image.getPresets.invalidate()
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to save preset:', error)
      throw error
    }
  }

  const handleDelete = async () => {
    if (!presetToDelete) return

    try {
      await deleteMutation.mutateAsync({ id: presetToDelete.id })
      await utils.preset.list.invalidate()
      await utils.image.getPresets.invalidate()
      setDeleteDialogOpen(false)
      setPresetToDelete(null)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to delete preset:', error)
    }
  }

  if (isLoading) {
    return (
      <div>
        <div className="mb-6">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-64 rounded-md" />
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Success Message */}
      {showSuccess && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          <IconCheck size={16} />
          <span>Preset saved successfully</span>
        </div>
      )}

      {/* Add Preset Button */}
      <div className="mb-4">
        <Button onClick={handleCreate}>
          <IconPlus size={16} className="mr-2" />
          Add Preset
        </Button>
      </div>

      {/* Presets Table */}
      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Dimensions</TableHead>
              <TableHead>Quality</TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Fit</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {presets && presets.length > 0 ? (
              presets.map((preset) => (
                <TableRow key={preset.id}>
                  <TableCell className="font-medium">{preset.name}</TableCell>
                  <TableCell>
                    {preset.maxWidth >= 999999 ? '∞' : preset.maxWidth} ×{' '}
                    {preset.maxHeight >= 999999 ? '∞' : preset.maxHeight}
                  </TableCell>
                  <TableCell>{preset.quality}%</TableCell>
                  <TableCell>
                    <span className="uppercase text-xs font-mono">{preset.format}</span>
                  </TableCell>
                  <TableCell>
                    <span className="capitalize">{preset.fit}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(preset)}
                        disabled={updateMutation.isPending}
                      >
                        <IconEdit size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(preset)}
                        disabled={deleteMutation.isPending}
                      >
                        <IconTrash size={16} className="text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No presets found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Preset Dialog */}
      <PresetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        preset={selectedPreset}
        mode={dialogMode}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Preset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the preset "{presetToDelete?.name}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
