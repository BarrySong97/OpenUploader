import { createFileRoute } from '@tanstack/react-router'
import { IconPhoto } from '@tabler/icons-react'

export const Route = createFileRoute('/settings/compression')({
  component: CompressionSettings
})

function CompressionSettings() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Image Compression</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure image compression settings for your uploads
        </p>
      </div>

      <div className="space-y-6">
        {/* Placeholder content - to be implemented later */}
        <div className="rounded-md border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <IconPhoto size={24} className="text-muted-foreground" />
            <h3 className="text-lg font-medium">Compression Settings</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Image compression settings will be configured here.
          </p>
        </div>
      </div>
    </div>
  )
}
