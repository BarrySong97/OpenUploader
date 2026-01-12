import { ElectronAPI } from '@electron-toolkit/preload'
import { ElectronTRPC } from 'trpc-electron/main'

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
    }
    electronTRPC: ElectronTRPC
  }
}
