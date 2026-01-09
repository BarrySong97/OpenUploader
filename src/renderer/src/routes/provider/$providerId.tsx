import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useProviders } from '@/contexts/provider-context'
import { mockFiles } from '@/lib/mock-data'
import type { FileItem, UploadItem } from '@/lib/types'
import { Toolbar } from '@/components/file-browser/toolbar'
import { Breadcrumb } from '@/components/file-browser/breadcrumb'
import { FileList } from '@/components/file-browser/file-list'
import { FileGrid } from '@/components/file-browser/file-grid'
import { UploadZone } from '@/components/upload/upload-zone'
import { UploadQueue } from '@/components/upload/upload-queue'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

export const Route = createFileRoute('/provider/$providerId')({
  component: ProviderDetail
})

function ProviderDetail() {
  const { providerId } = Route.useParams()
  const { getProvider, updateProviderBucket } = useProviders()
  const provider = getProvider(providerId)

  const [selectedBucket, setSelectedBucket] = useState(
    provider?.selectedBucket || provider?.bucket || ''
  )
  const [currentPath, setCurrentPath] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showUploadZone, setShowUploadZone] = useState(false)
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [showUploadQueue, setShowUploadQueue] = useState(false)

  // View mode state with localStorage persistence
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    const stored = localStorage.getItem('oss-file-view-mode')
    return (stored as 'list' | 'grid') || 'list'
  })

  useEffect(() => {
    localStorage.setItem('oss-file-view-mode', viewMode)
  }, [viewMode])

  // Update selected bucket when provider changes
  useEffect(() => {
    if (provider) {
      setSelectedBucket(provider.selectedBucket || provider.bucket)
    }
  }, [provider])

  const handleBucketChange = (bucketName: string) => {
    setSelectedBucket(bucketName)
    updateProviderBucket(providerId, bucketName)
    // Reset path and search when switching buckets
    setCurrentPath([])
    setSearchQuery('')
  }

  if (!provider) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-muted-foreground">Provider not found</p>
          <Link to="/">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Get files for current provider and selected bucket
  const allFiles = mockFiles[providerId]?.[selectedBucket] || []
  const filteredFiles = searchQuery
    ? allFiles.filter((file) => file.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : allFiles

  const handleFileClick = (file: FileItem) => {
    if (file.type === 'folder') {
      setCurrentPath([...currentPath, file.name])
    }
  }

  const handleNavigate = (index: number) => {
    if (index === -1) {
      setCurrentPath([])
    } else {
      setCurrentPath(currentPath.slice(0, index + 1))
    }
  }

  const handleRefresh = () => {
    console.log('Refresh files')
  }

  const handleNewFolder = () => {
    console.log('Create new folder')
  }

  const handleUpload = () => {
    setShowUploadZone(!showUploadZone)
  }

  const handleFilesSelected = (files: File[]) => {
    const newUploads: UploadItem[] = files.map((file) => ({
      id: Date.now().toString() + Math.random(),
      file,
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'pending'
    }))

    setUploads((prev) => [...prev, ...newUploads])
    setShowUploadQueue(true)
    setShowUploadZone(false)

    // Simulate upload progress
    newUploads.forEach((upload) => {
      simulateUpload(upload.id)
    })
  }

  const simulateUpload = (uploadId: string) => {
    setUploads((prev) =>
      prev.map((u) => (u.id === uploadId ? { ...u, status: 'uploading' as const } : u))
    )

    const interval = setInterval(() => {
      setUploads((prev) => {
        const upload = prev.find((u) => u.id === uploadId)
        if (!upload || upload.status !== 'uploading') {
          clearInterval(interval)
          return prev
        }

        const newProgress = Math.min(upload.progress + 10, 100)
        if (newProgress === 100) {
          clearInterval(interval)
          return prev.map((u) =>
            u.id === uploadId ? { ...u, progress: 100, status: 'completed' as const } : u
          )
        }

        return prev.map((u) => (u.id === uploadId ? { ...u, progress: newProgress } : u))
      })
    }, 500)
  }

  const handlePauseUpload = (id: string) => {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, status: 'paused' as const } : u)))
  }

  const handleResumeUpload = (id: string) => {
    simulateUpload(id)
  }

  const handleCancelUpload = (id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id))
  }

  const handleClearCompleted = () => {
    setUploads((prev) => prev.filter((u) => u.status !== 'completed'))
  }

  const handleDownload = (file: FileItem) => {
    console.log('Download file:', file.name)
  }

  const handleDelete = (file: FileItem) => {
    console.log('Delete file:', file.name)
  }

  const handleCopyUrl = (file: FileItem) => {
    if (file.url) {
      navigator.clipboard.writeText(file.url)
      console.log('Copied URL:', file.url)
    }
  }

  const handleRename = (file: FileItem) => {
    console.log('Rename file:', file.name)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <Select defaultValue={selectedBucket} onValueChange={handleBucketChange}>
              <SelectTrigger id="bucket-selector" size="sm" className="w-fit min-w-[120px]">
                <SelectValue placeholder="Select bucket" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {provider.buckets?.map((bucket) => (
                    <SelectItem key={bucket} value={bucket}>
                      {bucket}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">{provider.region}</span>
          </div>
          <div className="flex flex-col items-end gap-2">
            <h1 className="text-2xl font-bold">{provider.name}</h1>
            <Badge variant={provider.connected ? 'default' : 'secondary'}>
              {provider.connected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <Toolbar
        onRefresh={handleRefresh}
        onNewFolder={handleNewFolder}
        onUpload={handleUpload}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Breadcrumb */}
      <Breadcrumb path={currentPath} onNavigate={handleNavigate} />

      {/* File List */}
      <div className="flex-1 overflow-auto">
        {showUploadZone ? (
          <div className="p-8">
            <UploadZone onFilesSelected={handleFilesSelected} />
          </div>
        ) : viewMode === 'list' ? (
          <FileList
            files={filteredFiles}
            onFileClick={handleFileClick}
            onDownload={handleDownload}
            onDelete={handleDelete}
            onCopyUrl={handleCopyUrl}
            onRename={handleRename}
          />
        ) : (
          <FileGrid
            files={filteredFiles}
            onFileClick={handleFileClick}
            onDownload={handleDownload}
            onDelete={handleDelete}
            onCopyUrl={handleCopyUrl}
            onRename={handleRename}
          />
        )}
      </div>

      {/* Upload Queue */}
      {showUploadQueue && uploads.length > 0 && (
        <UploadQueue
          uploads={uploads}
          onPause={handlePauseUpload}
          onResume={handleResumeUpload}
          onCancel={handleCancelUpload}
          onClearCompleted={handleClearCompleted}
          onClose={() => setShowUploadQueue(false)}
        />
      )}
    </div>
  )
}
