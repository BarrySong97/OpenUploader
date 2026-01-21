import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { IconPhoto, IconSettings, IconEdit, IconTestPipe } from '@tabler/icons-react'
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
import { PresetDialog } from '@/components/preset-dialog'
import { ImageCropper } from '@/components/ui/image-cropper'
import type { AspectRatioOption } from '@/components/ui/image-cropper'
import { SettingsPageSkeleton } from '@/components/ui/page-skeletons'

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

function mapAspectRatio(ratio: string | null | undefined): AspectRatioOption {
  if (ratio === '16:9' || ratio === '4:3' || ratio === '1:1') return ratio
  return 'free'
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

interface CompressionResult {
  success: boolean
  outputPath?: string
  originalSize: number
  compressedSize?: number
  width?: number
  height?: number
  format?: string
  error?: string
}

function CompressionSettings() {
  const { data: presets, isLoading } = trpc.preset.list.useQuery()
  const utils = trpc.useUtils()
  const updateMutation = trpc.preset.update.useMutation({
    onSuccess: () => {
      utils.preset.list.invalidate()
    }
  })

  const selectFileMutation = trpc.image.selectImageFile.useMutation()
  const compressFileMutation = trpc.image.compressFile.useMutation()

  // Currently selected preset ID
  const [selectedPresetId, setSelectedPresetId] = useState<string>('standard')

  // Edit dialog state
  const [dialogOpen, setDialogOpen] = useState(false)

  // Compression test result
  const [testResult, setTestResult] = useState<CompressionResult | null>(null)

  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false)
  const [imageToProcess, setImageToProcess] = useState<{
    dataUrl: string
    filePath: string
  } | null>(null)

  // Get selected preset data
  const selectedPreset = presets?.find((p) => p.id === selectedPresetId)

  // Handle preset selection change
  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId)
    setTestResult(null)
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

  // Handle aspect ratio change
  const handleAspectRatioChange = (value: string) => {
    if (selectedPreset) {
      updateMutation.mutate({
        id: selectedPreset.id,
        aspectRatio: value === 'none' ? null : value
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

  // Handle test compression
  const handleTestCompression = async () => {
    setTestResult(null)

    // Select file
    const fileResult = await selectFileMutation.mutateAsync()
    if (fileResult.canceled || !fileResult.filePath || !fileResult.content) {
      return
    }

    // Check if preset has aspectRatio that requires cropping
    if (selectedPreset?.aspectRatio) {
      // Open cropper first
      setImageToProcess({
        dataUrl: `data:image/png;base64,${fileResult.content}`,
        filePath: fileResult.filePath
      })
      setCropperOpen(true)
    } else {
      // Compress directly without cropping
      const result = await compressFileMutation.mutateAsync({
        filePath: fileResult.filePath,
        presetId: selectedPresetId
      })
      setTestResult(result as CompressionResult)
    }
  }

  // Handle crop complete
  const handleCropComplete = async (croppedImageData: string) => {
    if (!imageToProcess) return

    // Extract base64 content from data URL
    const base64Content = croppedImageData.replace(/^data:image\/\w+;base64,/, '')

    // Compress the cropped image
    const result = await compressFileMutation.mutateAsync({
      filePath: imageToProcess.filePath,
      presetId: selectedPresetId,
      content: base64Content
    })

    setTestResult(result as CompressionResult)
    setImageToProcess(null)
  }

  const isTestingCompression = selectFileMutation.isPending || compressFileMutation.isPending

  if (isLoading) {
    return <SettingsPageSkeleton />
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
                          {preset.aspectRatio && ` (${preset.aspectRatio})`}
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

            {/* Aspect Ratio Select */}
            <div>
              <label className="text-sm font-medium mb-2 block">Crop Ratio</label>
              <Select
                onValueChange={handleAspectRatioChange}
                value={selectedPreset?.aspectRatio ?? 'none'}
                disabled={!selectedPreset}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No cropping" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No cropping</SelectItem>
                  <SelectItem value="16:9">16:9 (Widescreen)</SelectItem>
                  <SelectItem value="4:3">4:3 (Standard)</SelectItem>
                  <SelectItem value="1:1">1:1 (Square)</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-2 text-sm text-muted-foreground">
                When set, images will be cropped to this ratio before compression
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(true)}
                disabled={!selectedPreset}
              >
                <IconEdit size={16} className="mr-2" />
                Edit More
              </Button>
              <Button
                variant="outline"
                onClick={handleTestCompression}
                disabled={!selectedPreset || isTestingCompression}
              >
                <IconTestPipe size={16} className="mr-2" />
                {isTestingCompression ? 'Compressing...' : 'Test Compression'}
              </Button>
            </div>

            {/* Test Result */}
            {testResult && (
              <div
                className={`mt-4 rounded-md border p-4 ${
                  testResult.success
                    ? 'border-green-200 bg-green-50 text-green-800'
                    : 'border-red-200 bg-red-50 text-red-800'
                }`}
              >
                {testResult.success ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Compression successful</p>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-green-600">Original</p>
                        <p className="font-medium">{formatBytes(testResult.originalSize)}</p>
                      </div>
                      <div>
                        <p className="text-green-600">Compressed</p>
                        <p className="font-medium">{formatBytes(testResult.compressedSize || 0)}</p>
                      </div>
                      <div>
                        <p className="text-green-600">Saved</p>
                        <p className="font-medium">
                          {(
                            ((testResult.originalSize - (testResult.compressedSize || 0)) /
                              testResult.originalSize) *
                            100
                          ).toFixed(1)}
                          %
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4 text-sm">
                      {testResult.width && testResult.height && (
                        <p>
                          <span className="text-green-600">Dimensions:</span>{' '}
                          {testResult.width}×{testResult.height}
                        </p>
                      )}
                      {testResult.format && (
                        <p>
                          <span className="text-green-600">Format:</span>{' '}
                          <span className="uppercase">{testResult.format}</span>
                        </p>
                      )}
                    </div>
                    {testResult.outputPath && (
                      <p className="text-sm text-green-600 break-all">
                        Saved to: {testResult.outputPath}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Compression failed</p>
                    <p className="text-sm">{testResult.error}</p>
                  </div>
                )}
              </div>
            )}
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

      {/* Image Cropper Dialog */}
      <ImageCropper
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        imageSrc={imageToProcess?.dataUrl ?? ''}
        aspectRatio={mapAspectRatio(selectedPreset?.aspectRatio)}
        onCropComplete={handleCropComplete}
        title="Crop Image"
        description={`Crop to ${selectedPreset?.aspectRatio} ratio for ${selectedPreset?.name} preset`}
      />
    </div>
  )
}
