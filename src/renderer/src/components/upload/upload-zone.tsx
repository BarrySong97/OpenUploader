import { useState, useRef } from 'react'
import { IconUpload, IconFile } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void
  className?: string
}

export function UploadZone({ onFilesSelected, className }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      onFilesSelected(files)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      onFilesSelected(files)
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors',
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50',
        className
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />
      <div
        className={cn(
          'mb-4 flex size-16 items-center justify-center rounded-full transition-colors',
          isDragging ? 'bg-primary/20' : 'bg-muted'
        )}
      >
        {isDragging ? (
          <IconFile size={32} className="text-primary" />
        ) : (
          <IconUpload size={32} className="text-muted-foreground" />
        )}
      </div>
      <p className="mb-2 text-lg font-medium">
        {isDragging ? 'Drop files here' : 'Drag and drop files here'}
      </p>
      <p className="mb-4 text-sm text-muted-foreground">or</p>
      <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
        Browse Files
      </Button>
    </div>
  )
}
