import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  addS3ProviderFormSchema,
  addSupabaseProviderFormSchema,
  s3Variants,
  type S3Variant,
  type AddS3ProviderForm,
  type AddSupabaseProviderForm
} from '@renderer/db'
import { trpc } from '@renderer/lib/trpc'

interface AddProviderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultVariant?: S3Variant
}

type ProviderType = 's3-compatible' | 'supabase-storage'

const s3VariantLabels: Record<(typeof s3Variants)[number], string> = {
  'aws-s3': 'AWS S3',
  'aliyun-oss': 'Aliyun OSS',
  'tencent-cos': 'Tencent COS',
  'cloudflare-r2': 'Cloudflare R2',
  minio: 'MinIO',
  'backblaze-b2': 'Backblaze B2'
}

export function AddProviderDialog({ open, onOpenChange, defaultVariant }: AddProviderDialogProps) {
  const [providerType, setProviderType] = useState<ProviderType>('s3-compatible')

  const handleClose = () => {
    onOpenChange(false)
    setProviderType('s3-compatible')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Provider</DialogTitle>
          <DialogDescription>
            Add a new cloud storage provider to manage your files.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Provider Type</Label>
            <Select
              value={providerType}
              onValueChange={(value) => setProviderType(value as ProviderType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="s3-compatible">S3 Compatible</SelectItem>
                <SelectItem value="supabase-storage">Supabase Storage</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {providerType === 's3-compatible' ? (
            <S3ProviderForm onSuccess={handleClose} defaultVariant={defaultVariant} />
          ) : (
            <SupabaseProviderForm onSuccess={handleClose} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function S3ProviderForm({
  onSuccess,
  defaultVariant
}: {
  onSuccess: () => void
  defaultVariant?: S3Variant
}) {
  const utils = trpc.useUtils()
  const createMutation = trpc.provider.create.useMutation({
    onSuccess: () => {
      utils.provider.list.invalidate()
      form.reset()
      onSuccess()
    },
    onError: (error) => {
      console.error('Create S3 provider error:', error)
    }
  })

  const form = useForm<AddS3ProviderForm>({
    resolver: standardSchemaResolver(addS3ProviderFormSchema),
    mode: 'onSubmit',
    defaultValues: {
      name: '',
      type: 's3-compatible',
      variant: defaultVariant || 'aws-s3',
      accessKeyId: '',
      secretAccessKey: '',
      region: '',
      endpoint: '',
      bucket: '',
      accountId: ''
    }
  })

  // Update variant when defaultVariant changes
  useEffect(() => {
    if (defaultVariant) {
      form.setValue('variant', defaultVariant)
    }
  }, [defaultVariant, form])

  const selectedVariant = form.watch('variant')

  const onSubmit = (data: AddS3ProviderForm) => {
    createMutation.mutate({
      id: crypto.randomUUID(),
      ...data
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <Controller
        name="name"
        control={form.control}
        render={({ field, fieldState }) => {
          console.log(fieldState)
          return (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Name</FieldLabel>
              <Input
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                placeholder="My S3 Storage"
              />
              {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
            </Field>
          )
        }}
      />

      <Controller
        name="variant"
        control={form.control}
        render={({ field, fieldState }) => {
          return (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Service</FieldLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {s3Variants.map((variant) => (
                    <SelectItem key={variant} value={variant}>
                      {s3VariantLabels[variant]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
            </Field>
          )
        }}
      />

      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="accessKeyId"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Access Key ID</FieldLabel>
              <Input
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                placeholder="AKIAIOSFODNN7EXAMPLE"
              />
              {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
            </Field>
          )}
        />

        <Controller
          name="secretAccessKey"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Secret Access Key</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="password"
                aria-invalid={fieldState.invalid}
                placeholder="••••••••"
              />
              {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
            </Field>
          )}
        />
      </div>

      {selectedVariant === 'cloudflare-r2' && (
        <Controller
          name="accountId"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Account ID</FieldLabel>
              <Input
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                placeholder="Your Cloudflare Account ID"
              />
              {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
            </Field>
          )}
        />
      )}

      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="region"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Region</FieldLabel>
              <Input
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                placeholder="us-east-1"
              />
              {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
            </Field>
          )}
        />

        <Controller
          name="endpoint"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Endpoint (Optional)</FieldLabel>
              <Input
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                placeholder="https://s3.example.com"
              />
              {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
            </Field>
          )}
        />
      </div>

      <Controller
        name="bucket"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Default Bucket (Optional)</FieldLabel>
            <Input
              {...field}
              id={field.name}
              aria-invalid={fieldState.invalid}
              placeholder="my-bucket"
            />
            {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
          </Field>
        )}
      />

      <DialogFooter>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Adding...' : 'Add Provider'}
        </Button>
      </DialogFooter>
    </form>
  )
}

function SupabaseProviderForm({ onSuccess }: { onSuccess: () => void }) {
  const utils = trpc.useUtils()
  const createMutation = trpc.provider.create.useMutation({
    onSuccess: () => {
      utils.provider.list.invalidate()
      form.reset()
      onSuccess()
    },
    onError: (error) => {
      console.error('Create Supabase provider error:', error)
    }
  })

  const form = useForm<AddSupabaseProviderForm>({
    resolver: standardSchemaResolver(addSupabaseProviderFormSchema),
    mode: 'onSubmit',
    defaultValues: {
      name: '',
      type: 'supabase-storage',
      projectUrl: '',
      anonKey: '',
      serviceRoleKey: '',
      bucket: ''
    }
  })

  const onSubmit = (data: AddSupabaseProviderForm) => {
    createMutation.mutate({
      id: crypto.randomUUID(),
      ...data
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <Controller
        name="name"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Name</FieldLabel>
            <Input
              {...field}
              id={field.name}
              aria-invalid={fieldState.invalid}
              placeholder="My Supabase Storage"
            />
            {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
          </Field>
        )}
      />

      <Controller
        name="projectUrl"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Project URL</FieldLabel>
            <Input
              {...field}
              id={field.name}
              aria-invalid={fieldState.invalid}
              placeholder="https://xxx.supabase.co"
            />
            {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
          </Field>
        )}
      />

      <Controller
        name="anonKey"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Anon Key (Optional)</FieldLabel>
            <Input
              {...field}
              id={field.name}
              type="password"
              aria-invalid={fieldState.invalid}
              placeholder="••••••••"
            />
            {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
          </Field>
        )}
      />

      <Controller
        name="serviceRoleKey"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Service Role Key (Optional)</FieldLabel>
            <Input
              {...field}
              id={field.name}
              type="password"
              aria-invalid={fieldState.invalid}
              placeholder="••••••••"
            />
            {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
          </Field>
        )}
      />

      <Controller
        name="bucket"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Default Bucket (Optional)</FieldLabel>
            <Input
              {...field}
              id={field.name}
              aria-invalid={fieldState.invalid}
              placeholder="my-bucket"
            />
            {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
          </Field>
        )}
      />

      <DialogFooter>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Adding...' : 'Add Provider'}
        </Button>
      </DialogFooter>
    </form>
  )
}
