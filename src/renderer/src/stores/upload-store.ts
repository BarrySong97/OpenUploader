import { create } from 'zustand'

export type UploadStatus = 'pending' | 'compressing' | 'uploading' | 'completed' | 'error' | 'paused'

export interface UploadTask {
  id: string
  file: File
  providerId: string
  bucket: string
  prefix?: string
  status: UploadStatus
  progress: number
  error?: string
  compressionEnabled: boolean
  compressionPreset?: string
  originalSize: number
  compressedSize?: number
  isImage: boolean
}

interface UploadStore {
  tasks: UploadTask[]
  isProcessing: boolean
  maxConcurrent: number

  // Actions
  addTasks: (
    tasks: Array<{
      file: File
      providerId: string
      bucket: string
      prefix?: string
      compressionEnabled?: boolean
      compressionPreset?: string
    }>
  ) => void
  removeTask: (id: string) => void
  updateTask: (id: string, updates: Partial<UploadTask>) => void
  pauseTask: (id: string) => void
  resumeTask: (id: string) => void
  clearCompleted: () => void
  clearAll: () => void
  setProcessing: (isProcessing: boolean) => void
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function isImageFile(file: File): boolean {
  return (
    file.type.startsWith('image/') &&
    ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'].includes(
      file.type.toLowerCase()
    )
  )
}

export const useUploadStore = create<UploadStore>((set, get) => ({
  tasks: [],
  isProcessing: false,
  maxConcurrent: 3,

  addTasks: (newTasks) => {
    const tasks: UploadTask[] = newTasks.map((task) => ({
      id: generateId(),
      file: task.file,
      providerId: task.providerId,
      bucket: task.bucket,
      prefix: task.prefix,
      status: 'pending',
      progress: 0,
      compressionEnabled: task.compressionEnabled ?? true,
      compressionPreset: task.compressionPreset ?? 'standard',
      originalSize: task.file.size,
      isImage: isImageFile(task.file)
    }))

    set((state) => ({
      tasks: [...state.tasks, ...tasks]
    }))
  },

  removeTask: (id) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id)
    }))
  },

  updateTask: (id, updates) => {
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t))
    }))
  },

  pauseTask: (id) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id && t.status === 'pending' ? { ...t, status: 'paused' as UploadStatus } : t
      )
    }))
  },

  resumeTask: (id) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id && t.status === 'paused' ? { ...t, status: 'pending' as UploadStatus } : t
      )
    }))
  },

  clearCompleted: () => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.status !== 'completed')
    }))
  },

  clearAll: () => {
    set({ tasks: [] })
  },

  setProcessing: (isProcessing) => {
    set({ isProcessing })
  }
}))

// Selectors
export const selectPendingTasks = (state: UploadStore) =>
  state.tasks.filter((t) => t.status === 'pending')

export const selectActiveTasks = (state: UploadStore) =>
  state.tasks.filter((t) => ['compressing', 'uploading'].includes(t.status))

export const selectCompletedTasks = (state: UploadStore) =>
  state.tasks.filter((t) => t.status === 'completed')

export const selectErrorTasks = (state: UploadStore) =>
  state.tasks.filter((t) => t.status === 'error')

export const selectTotalProgress = (state: UploadStore) => {
  if (state.tasks.length === 0) return 0
  const total = state.tasks.reduce((acc, t) => acc + t.progress, 0)
  return Math.round(total / state.tasks.length)
}
