export type ProviderType = 'aliyun' | 'aws' | 'tencent' | 'qiniu'

export interface Provider {
  id: string
  name: string
  type: ProviderType
  bucket: string
  buckets: string[]
  selectedBucket?: string
  region: string
  accessKey?: string
  secretKey?: string
  endpoint?: string
  connected: boolean
  stats: {
    files: number
    storage: string
  }
  createdAt: string
}

export interface FileItem {
  id: string
  name: string
  type: 'file' | 'folder'
  size?: number
  modified: Date
  mimeType?: string
  url?: string
}

export interface UploadItem {
  id: string
  file: File
  name: string
  size: number
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'paused'
  error?: string
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  language: string
  defaultProvider?: string
  uploadSettings: {
    autoUpload: boolean
    maxConcurrent: number
  }
}
