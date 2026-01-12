import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { IconPhoto, IconCheck } from '@tabler/icons-react'
import { trpc } from '@renderer/lib/trpc'
import {
  imageCompressionSettingsSchema,
  fitModes,
  compressionPresets
} from '@shared/schema/settings'
import type { ImageCompressionSettings } from '@shared/schema/settings'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
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

const presetDescriptions: Record<string, string> = {
  thumbnail: 'Small preview (200x200, 60% quality, cover fit)',
  preview: 'Medium preview (800x800, 75% quality, inside fit)',
  standard: 'Standard quality (1920x1920, 85% quality, inside fit)',
  hd: 'High definition (4096x4096, 90% quality, inside fit)',
  original: 'Original size and quality (no compression)'
}

function CompressionSettings() {
  const { data: settings, isLoading } = trpc.settings.get.useQuery()
  const { data: presets } = trpc.image.getPresets.useQuery()
  const updateMutation = trpc.settings.updateImageCompression.useMutation()
  const [showSuccess, setShowSuccess] = useState(false)

  const form = useForm<ImageCompressionSettings>({
    resolver: zodResolver(imageCompressionSettingsSchema),
    defaultValues: {
      quality: 85,
      fit: 'inside',
      preset: 'standard'
    }
  })

  // Update form when settings are loaded
  useEffect(() => {
    if (settings?.imageCompression) {
      form.reset(settings.imageCompression)
    }
  }, [settings, form])

  // Update quality and fit when preset changes
  const selectedPreset = form.watch('preset')

  useEffect(() => {
    if (selectedPreset && presets) {
      const presetConfig = presets[selectedPreset]
      if (presetConfig) {
        form.setValue('quality', presetConfig.quality)
        form.setValue('fit', presetConfig.fit)
      }
    }
  }, [selectedPreset, presets, form])

  const onSubmit = async (data: ImageCompressionSettings) => {
    try {
      await updateMutation.mutateAsync(data)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to save settings:', error)
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
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Image Compression</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure default image compression settings for your uploads
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-md border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <IconPhoto size={24} className="text-muted-foreground" />
            <h3 className="text-lg font-medium">Compression Settings</h3>
          </div>

          <div className="space-y-6">
            {/* Preset Select */}
            <Controller
              name="preset"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Default Preset</FieldLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id={field.name} aria-invalid={fieldState.invalid} className="w-full">
                      <SelectValue placeholder="Select preset" />
                    </SelectTrigger>
                    <SelectContent>
                      {compressionPresets.map((preset) => (
                        <SelectItem key={preset} value={preset}>
                          <span className="capitalize">{preset}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {field.value && presetDescriptions[field.value] && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {presetDescriptions[field.value]}
                    </p>
                  )}
                  {fieldState.error?.message && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            {/* Quality Slider */}
            <Controller
              name="quality"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <div className="flex items-center justify-between mb-2">
                    <FieldLabel htmlFor={field.name}>Quality</FieldLabel>
                    <span className="text-sm font-medium text-muted-foreground">
                      {field.value}%
                    </span>
                  </div>
                  <Slider
                    id={field.name}
                    min={1}
                    max={100}
                    step={1}
                    value={[field.value]}
                    onValueChange={(value) => field.onChange(value[0])}
                    aria-invalid={fieldState.invalid}
                  />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Higher quality means larger file sizes (1-100)
                  </p>
                  {fieldState.error?.message && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            {/* Fit Mode Select */}
            <Controller
              name="fit"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Fit Mode</FieldLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id={field.name} aria-invalid={fieldState.invalid} className="w-full">
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
                  {field.value && fitModeDescriptions[field.value] && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {fitModeDescriptions[field.value]}
                    </p>
                  )}
                  {fieldState.error?.message && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
          {showSuccess && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <IconCheck size={16} />
              <span>Settings saved successfully</span>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}
