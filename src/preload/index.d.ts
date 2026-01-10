import { ElectronAPI } from '@electron-toolkit/preload'
import { ElectronTRPC } from 'trpc-electron/main'

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    electronTRPC: ElectronTRPC
  }
}
