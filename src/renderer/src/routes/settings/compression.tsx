import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { IconPhoto, IconSettings, IconEdit } from '@tabler/icons-react'
import { trpc } from '@renderer/lib/trpc'
import { fitModes } from '@shared/schema/settings'
import type { CreatePresetInput } from '@shared/schema/settings'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Skeleton } from '@/components/ui/skeleton'
import { PresetDialog } from '@/components/preset-dialog'

export const Route = createFileRoute('/settings/compression')({
  component: CompressionSettings
})

const fitModeDescriptions: Record<string, string> = {
  cover: 'Crop to fill dimensions (may cut edges)',
  contain: 'Fit inside dimensions (may have empty space)',
  fill: 'Stretch to fill (may distort)',
  inside: 'Fit inside, no enlargement (default)',
  outside: 'Fit outside, may crop'
}

function CompressionSettings() {
  const { data: presets, isLoading } = trpc.preset.list.useQuery()
  const utils = trpc.useUtils()
  const updateMutation = trpc.preset.update.useMutation({
    onSuccess: () => {
      utils.preset.list.invalidate()
    }
  })

  // Currently selected preset ID
  const [selectedPresetId, setSelectedPresetId] = useState<string>('standard')

  // Edit dialog state
  const [dialogOpen, setDialogOpen] = useState(false)

  // Get selected preset data
  const selectedPreset = presets?.find((p) => p.id === selectedPresetId)

  // Handle preset selection change
  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId)
  }

  // Handle quality change
  const handleQualityChange = (value: number[]) => {
    if (selectedPreset) {
      updateMutation.mutate({
        id: selectedPreset.id,
        quality: value[0]
      })
    }
  }

  // Handle fit mode change
  const handleFitChange = (value: string) => {
    if (selectedPreset) {
      updateMutation.mutate({
        id: selectedPreset.id,
        fit: value as typeof selectedPreset.fit
      })
    }
  }

  // Handle edit more dialog submit
  const handleEditSubmit = async (data: CreatePresetInput) => {
    if (selectedPreset) {
      await updateMutation.mutateAsync({
        id: selectedPreset.id,
        ...data
      })
    }
  }

  if (isLoading) {
    return (
      <div>
        <div className="mb-6">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-64 rounded-md" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Image Compression</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Select a preset and adjust compression settings
          </p>
        </div>
        <Link to="/settings/presets">
          <Button variant="outline">
            <IconSettings size={16} className="mr-2" />
            Manage Presets
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        <div className="rounded-md border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <IconPhoto size={24} className="text-muted-foreground" />
            <h3 className="text-lg font-medium">Compression Settings</h3>
          </div>

          <div className="space-y-6">
            {/* Preset Select */}
            <div>
              <label className="text-sm font-medium mb-2 block">Preset</label>
              <Select onValueChange={handlePresetChange} value={selectedPresetId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select preset" />
                </SelectTrigger>
                <SelectContent>
                  {presets?.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      <div className="flex items-center gap-2">
                        <span>{preset.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {preset.maxWidth >= 999999 ? '∞' : preset.maxWidth}×
                          {preset.maxHeight >= 999999 ? '∞' : preset.maxHeight}, {preset.quality}%,{' '}
                          <span className="uppercase">{preset.format}</span>
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quality Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Quality</label>
                <span className="text-sm font-medium text-muted-foreground">
                  {selectedPreset?.quality ?? 85}%
                </span>
              </div>
              <Slider
                min={1}
                max={100}
                step={1}
                value={[selectedPreset?.quality ?? 85]}
                onValueChange={handleQualityChange}
                disabled={!selectedPreset}
              />
              <p className="mt-2 text-sm text-muted-foreground">
                Higher quality means larger file sizes (1-100)
              </p>
            </div>

            {/* Fit Mode Select */}
            <div>
              <label className="text-sm font-medium mb-2 block">Fit Mode</label>
              <Select
                onValueChange={handleFitChange}
                value={selectedPreset?.fit ?? 'inside'}
                disabled={!selectedPreset}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select fit mode" />
                </SelectTrigger>
                <SelectContent>
                  {fitModes.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      <span className="capitalize">{mode}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPreset?.fit && fitModeDescriptions[selectedPreset.fit] && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {fitModeDescriptions[selectedPreset.fit]}
                </p>
              )}
            </div>

            {/* Edit More Button */}
            <div className="pt-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(true)}
                disabled={!selectedPreset}
              >
                <IconEdit size={16} className="mr-2" />
                Edit More
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Preset Dialog */}
      <PresetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleEditSubmit}
        preset={selectedPreset}
        mode="edit"
      />
    </div>
  )
}
