import { ElectronAPI } from '@electron-toolkit/preload'
import { ElectronTRPC } from 'trpc-electron/main'

interface UpdateInfo {
  version: string
  files: any[]
  releaseDate: string
  releaseNotes?: string
  releaseName?: string
}

interface ProgressInfo {
  total: number
  delta: number
  transferred: number
  percent: number
  bytesPerSecond: number
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      platform: {
        isMac: boolean
        isWindows: boolean
        isLinux: boolean
        name: NodeJS.Platform
      }
      getAppVersion: () => Promise<string>
      showInFolder: (filePath: string) => Promise<void>
      getDatabasePath: () => Promise<string>
      readFile: (filePath: string) => Promise<{ name: string; mimeType: string; data: Uint8Array }>
      createMarkdownTempDir: () => Promise<string>
      downloadRemoteFile: (
        url: string,
        tempDir: string
      ) => Promise<{ name: string; mimeType: string; path: string }>
      removeMarkdownTempDir: (tempDir: string) => Promise<void>
      notifyOpenFilesReady: () => void
      onOpenFiles: (callback: (filePaths: string[]) => void) => () => void
      updater: {
        checkForUpdates: () => Promise<{ success?: boolean; error?: string; updateInfo?: any }>
        downloadUpdate: () => Promise<void>
        installUpdate: () => void
        onUpdateChecking: (callback: () => void) => () => void
        onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void
        onUpdateNotAvailable: (callback: (info: UpdateInfo) => void) => () => void
        onDownloadProgress: (callback: (progress: ProgressInfo) => void) => () => void
        onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => () => void
        onUpdateError: (callback: (error: Error) => void) => () => void
      }
    }
    electronTRPC: ElectronTRPC
  }
}
