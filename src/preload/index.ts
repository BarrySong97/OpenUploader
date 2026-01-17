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
  showInFolder: (filePath: string) => ipcRenderer.invoke('show-in-folder', filePath),
  getDatabasePath: () => ipcRenderer.invoke('get-database-path')
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
