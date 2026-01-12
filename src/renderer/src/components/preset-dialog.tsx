import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select'
import { createPresetInputSchema, fitModes, compressionFormats } from '@shared/schema/settings'
import type { CreatePresetInput, Preset } from '@shared/schema/settings'

interface PresetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreatePresetInput) => Promise<void>
  preset?: Preset | null
  mode: 'create' | 'edit'
}

export function PresetDialog({ open, onOpenChange, onSubmit, preset, mode }: PresetDialogProps) {
  const form = useForm<CreatePresetInput>({
    resolver: zodResolver(createPresetInputSchema),
    defaultValues: {
      name: '',
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 85,
      format: 'webp',
      fit: 'inside'
    }
  })

  // Reset form when preset changes or dialog opens
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && preset) {
        form.reset({
          name: preset.name,
          maxWidth: preset.maxWidth,
          maxHeight: preset.maxHeight,
          quality: preset.quality,
          format: preset.format,
          fit: preset.fit
        })
      } else {
        form.reset({
          name: '',
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 85,
          format: 'webp',
          fit: 'inside'
        })
      }
    }
  }, [open, mode, preset, form])

  const handleSubmit = async (data: CreatePresetInput) => {
    try {
      await onSubmit(data)
      onOpenChange(false)
      form.reset()
    } catch (error) {
      console.error('Failed to save preset:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Preset' : 'Edit Preset'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a new compression preset with custom settings.'
              : 'Edit the compression preset settings.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Name */}
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Preset Name</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  placeholder="e.g., My Custom Preset"
                />
                {fieldState.error?.message && (
                  <FieldError>{fieldState.error.message}</FieldError>
                )}
              </Field>
            )}
          />

          {/* Max Width */}
          <Controller
            name="maxWidth"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Max Width (px)</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  type="number"
                  min={1}
                  max={10000}
                  aria-invalid={fieldState.invalid}
                  onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                />
                {fieldState.error?.message && (
                  <FieldError>{fieldState.error.message}</FieldError>
                )}
              </Field>
            )}
          />

          {/* Max Height */}
          <Controller
            name="maxHeight"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Max Height (px)</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  type="number"
                  min={1}
                  max={10000}
                  aria-invalid={fieldState.invalid}
                  onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                />
                {fieldState.error?.message && (
                  <FieldError>{fieldState.error.message}</FieldError>
                )}
              </Field>
            )}
          />

          {/* Quality */}
          <Controller
            name="quality"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <div className="flex items-center justify-between mb-2">
                  <FieldLabel htmlFor={field.name}>Quality</FieldLabel>
                  <span className="text-sm font-medium text-muted-foreground">{field.value}%</span>
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
                {fieldState.error?.message && (
                  <FieldError>{fieldState.error.message}</FieldError>
                )}
              </Field>
            )}
          />

          {/* Format */}
          <Controller
            name="format"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Output Format</FieldLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    {compressionFormats.map((format) => (
                      <SelectItem key={format} value={format}>
                        <span className="uppercase">{format}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.error?.message && (
                  <FieldError>{fieldState.error.message}</FieldError>
                )}
              </Field>
            )}
          />

          {/* Fit Mode */}
          <Controller
            name="fit"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Fit Mode</FieldLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
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
                {fieldState.error?.message && (
                  <FieldError>{fieldState.error.message}</FieldError>
                )}
              </Field>
            )}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? mode === 'create'
                  ? 'Creating...'
                  : 'Saving...'
                : mode === 'create'
                  ? 'Create Preset'
                  : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
