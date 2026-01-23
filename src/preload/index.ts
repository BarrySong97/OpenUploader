import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { exposeElectronTRPC } from 'trpc-electron/main'

// Expose electron-trpc to renderer
process.once('loaded', () => {
  exposeElectronTRPC()
})

// Custom APIs for renderer
const api = {
  platform: {
    isMac: process.platform === 'darwin',
    isWindows: process.platform === 'win32',
    isLinux: process.platform === 'linux',
    name: process.platform
  },
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  showInFolder: (filePath: string) => ipcRenderer.invoke('show-in-folder', filePath),
  getDatabasePath: () => ipcRenderer.invoke('get-database-path'),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  notifyOpenFilesReady: () => ipcRenderer.send('open-files-ready'),
  onOpenFiles: (callback: (filePaths: string[]) => void) => {
    const handler = (_event: unknown, filePaths: string[]) => callback(filePaths)
    ipcRenderer.on('open-files', handler)
    return () => ipcRenderer.removeListener('open-files', handler)
  },
  // Auto-updater APIs
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    installUpdate: () => ipcRenderer.invoke('install-update'),
    onUpdateChecking: (callback: () => void) => {
      ipcRenderer.on('update-checking', callback)
      return () => ipcRenderer.removeListener('update-checking', callback)
    },
    onUpdateAvailable: (callback: (info: any) => void) => {
      ipcRenderer.on('update-available', (_event, info) => callback(info))
      return () => ipcRenderer.removeListener('update-available', callback)
    },
    onUpdateNotAvailable: (callback: (info: any) => void) => {
      ipcRenderer.on('update-not-available', (_event, info) => callback(info))
      return () => ipcRenderer.removeListener('update-not-available', callback)
    },
    onDownloadProgress: (callback: (progress: any) => void) => {
      ipcRenderer.on('update-download-progress', (_event, progress) => callback(progress))
      return () => ipcRenderer.removeListener('update-download-progress', callback)
    },
    onUpdateDownloaded: (callback: (info: any) => void) => {
      ipcRenderer.on('update-downloaded', (_event, info) => callback(info))
      return () => ipcRenderer.removeListener('update-downloaded', callback)
    },
    onUpdateError: (callback: (error: any) => void) => {
      ipcRenderer.on('update-error', (_event, error) => callback(error))
      return () => ipcRenderer.removeListener('update-error', callback)
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
