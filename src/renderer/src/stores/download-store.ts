import { create } from 'zustand'

export type DownloadStatus = 'downloading' | 'completed' | 'error'

export interface DownloadTask {
  id: string
  key: string
  fileName: string
  fileSize: number
  providerId: string
  bucket: string
  status: DownloadStatus
  error?: string
  startedAt: number
  completedAt?: number
  filePath?: string
}

interface DownloadStore {
  tasks: DownloadTask[]
  isDrawerOpen: boolean

  addTask: (task: Omit<DownloadTask, 'id' | 'startedAt'>) => string
  updateTask: (id: string, updates: Partial<DownloadTask>) => void
  removeTask: (id: string) => void
  clearCompleted: () => void
  setDrawerOpen: (open: boolean) => void
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export const useDownloadStore = create<DownloadStore>((set) => ({
  tasks: [],
  isDrawerOpen: false,

  addTask: (task) => {
    const id = generateId()
    set((state) => ({
      tasks: [...state.tasks, { ...task, id, startedAt: Date.now() }]
    }))
    return id
  },

  updateTask: (id, updates) => {
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === id ? { ...task, ...updates } : task))
    }))
  },

  removeTask: (id) => {
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id)
    }))
  },

  clearCompleted: () => {
    set((state) => ({
      tasks: state.tasks.filter((task) => task.status !== 'completed')
    }))
  },

  setDrawerOpen: (open) => {
    set({ isDrawerOpen: open })
  }
}))

export const selectActiveDownloads = (state: DownloadStore) =>
  state.tasks.filter((task) => task.status === 'downloading')

export const selectCompletedDownloads = (state: DownloadStore) =>
  state.tasks.filter((task) => task.status === 'completed')

export const selectFailedDownloads = (state: DownloadStore) =>
  state.tasks.filter((task) => task.status === 'error')
