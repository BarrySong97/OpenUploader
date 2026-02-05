import { create } from 'zustand'
import type { MarkdownData } from '@/lib/markdown-image'

interface GlobalUploadCallbacks {
  onUploadStart?: () => void
  onUploadComplete?: () => void
}

interface GlobalUploadState extends GlobalUploadCallbacks {
  isOpen: boolean
  files: File[]
  markdownData: MarkdownData[]
  openWithFiles: (files: File[], callbacks?: GlobalUploadCallbacks) => void
  appendFiles: (files: File[], callbacks?: GlobalUploadCallbacks) => void
  setOpen: (open: boolean) => void
  setMarkdownData: (data: MarkdownData[]) => void
  clearMarkdownData: () => void
  clear: () => void
}

export const useGlobalUploadStore = create<GlobalUploadState>((set) => ({
  isOpen: false,
  files: [],
  markdownData: [],
  onUploadStart: undefined,
  onUploadComplete: undefined,
  openWithFiles: (files, callbacks) => {
    set({
      isOpen: true,
      files,
      markdownData: [],
      onUploadStart: callbacks?.onUploadStart,
      onUploadComplete: callbacks?.onUploadComplete
    })
  },
  appendFiles: (files, callbacks) => {
    set((state) => {
      const existingKeys = new Set(
        state.files.map((file) => `${file.name}:${file.size}:${file.lastModified}`)
      )
      const nextFiles = files.filter(
        (file) => !existingKeys.has(`${file.name}:${file.size}:${file.lastModified}`)
      )
      return {
        isOpen: true,
        files: nextFiles.length > 0 ? [...state.files, ...nextFiles] : state.files,
        onUploadStart: callbacks?.onUploadStart ?? state.onUploadStart,
        onUploadComplete: callbacks?.onUploadComplete ?? state.onUploadComplete
      }
    })
  },
  setOpen: (open) => {
    if (open) {
      set({ isOpen: true })
      return
    }
    set({
      isOpen: false,
      files: [],
      markdownData: [],
      onUploadStart: undefined,
      onUploadComplete: undefined
    })
  },
  setMarkdownData: (data) => {
    set({ markdownData: data })
  },
  clearMarkdownData: () => {
    set({ markdownData: [] })
  },
  clear: () =>
    set({
      isOpen: false,
      files: [],
      markdownData: [],
      onUploadStart: undefined,
      onUploadComplete: undefined
    })
}))
