import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join, basename, extname } from 'path'
import { pathToFileURL } from 'url'
import { promises as fs } from 'fs'
import { appendFileSync, existsSync, mkdirSync, statSync } from 'fs'

import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { createIPCHandler } from 'trpc-electron/main'
import { autoUpdater } from 'electron-updater'
import icon from '../../resources/icon.png?asset'
import { appRouter } from './trpc/router'
import { initDatabase, getDatabasePath } from './db'
import { initializeBuiltInPresets } from './services/preset-service'

// 导入 package.json 获取版本号
import packageInfo from '../../package.json'

const pendingOpenFiles = new Set<string>()
let isRendererReady = false
const logDirectoryName = 'logs'
const logFileName = 'main.log'

function logMain(message: string, error?: unknown): void {
  try {
    const logDir = join(app.getPath('userData'), logDirectoryName)
    mkdirSync(logDir, { recursive: true })
    const logPath = join(logDir, logFileName)
    const details = error instanceof Error ? `\n${error.stack || error.message}` : ''
    const line = `[${new Date().toISOString()}] ${message}${details}\n`
    appendFileSync(logPath, line)
  } catch (logError) {
    console.error('[MainLog] Failed to write log', logError)
  }
}

process.on('uncaughtException', (error) => {
  logMain('[Process] Uncaught exception', error)
})

process.on('unhandledRejection', (reason) => {
  logMain('[Process] Unhandled rejection', reason)
})

app.on('render-process-gone', (_event, _webContents, details) => {
  logMain(`[Process] Renderer gone: ${details.reason}`)
})

function getMimeTypeFromPath(filePath: string): string {
  const extension = extname(filePath).toLowerCase()
  switch (extension) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.webp':
      return 'image/webp'
    case '.gif':
      return 'image/gif'
    case '.bmp':
      return 'image/bmp'
    case '.svg':
      return 'image/svg+xml'
    default:
      return 'application/octet-stream'
  }
}

function isAllowedOpenFile(filePath: string): boolean {
  const extension = extname(filePath).toLowerCase()
  return ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg'].includes(extension)
}

function normalizeOpenFiles(paths: string[]): string[] {
  const results: string[] = []
  const seen = new Set<string>()

  for (const rawPath of paths) {
    if (!rawPath || rawPath.startsWith('-')) continue
    if (!existsSync(rawPath)) continue
    if (!isAllowedOpenFile(rawPath)) continue
    try {
      const stats = statSync(rawPath)
      if (!stats.isFile()) continue
    } catch {
      continue
    }
    if (seen.has(rawPath)) continue
    seen.add(rawPath)
    results.push(rawPath)
  }

  return results
}

function getOpenFileArgs(args: string[]): string[] {
  if (!args || args.length === 0) return []
  if (!app.isPackaged && !args.includes('--open-file')) return []
  return normalizeOpenFiles(args.slice(1))
}

function sendOpenFiles(paths: string[]): void {
  if (paths.length === 0) return
  const windows = BrowserWindow.getAllWindows()
  if (windows.length === 0) {
    paths.forEach((filePath) => pendingOpenFiles.add(filePath))
    return
  }
  const hasLoadingWindow = windows.some((window) => window.webContents.isLoading())
  if (hasLoadingWindow || !isRendererReady) {
    paths.forEach((filePath) => pendingOpenFiles.add(filePath))
    return
  }
  windows.forEach((window) => {
    window.webContents.send('open-files', paths)
  })
}

function handleOpenFiles(paths: string[]): void {
  const normalized = normalizeOpenFiles(paths)
  if (normalized.length === 0) return
  sendOpenFiles(normalized)
}

if (app.isPackaged) {
  const gotSingleInstanceLock = app.requestSingleInstanceLock()
  if (!gotSingleInstanceLock) {
    logMain('[SingleInstance] Lock failed, quitting.')
    app.quit()
  } else {
    app.on('second-instance', (_event, commandLine) => {
      handleOpenFiles(getOpenFileArgs(commandLine))
      const window = BrowserWindow.getAllWindows()[0]
      if (window) {
        if (window.isMinimized()) window.restore()
        window.focus()
      }
    })
  }
}

app.on('open-file', (event, filePath) => {
  // macOS hook (kept for future)
  event.preventDefault()
  handleOpenFiles([filePath])
})

function createWindow(): BrowserWindow {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1376,
    height: 870,
    show: false,
    titleBarStyle: 'hidden',
    vibrancy: 'under-window',
    titleBarOverlay: {
      color: '#ffffff',
      height: 32,
      symbolColor: '#6a7282'
    },
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    // Open DevTools in development mode
    if (is.dev) {
      mainWindow.webContents.openDevTools()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    const indexUrl = pathToFileURL(join(__dirname, '../renderer/index.html')).toString()
    mainWindow.loadURL(`${indexUrl}#/`)
  }

  return mainWindow
}

// Configure auto-updater
function setupAutoUpdater(mainWindow: BrowserWindow): void {
  // 配置更新日志
  autoUpdater.logger = console

  // 禁用自动下载
  autoUpdater.autoDownload = false

  // 在开发环境下不检查更新
  if (is.dev || import.meta.env.VITE_APP_ENV !== 'prod') {
    return
  }

  // 检查更新事件
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...')
    mainWindow.webContents.send('update-checking')
  })

  // 发现新版本
  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info)
    mainWindow.webContents.send('update-available', info)
  })

  // 没有新版本
  autoUpdater.on('update-not-available', (info) => {
    console.log('Update not available:', info)
    mainWindow.webContents.send('update-not-available', info)
  })

  // 下载进度
  autoUpdater.on('download-progress', (progressObj) => {
    console.log(`Download progress: ${progressObj.percent}%`)
    mainWindow.webContents.send('update-download-progress', progressObj)
  })

  // 下载完成
  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info)
    mainWindow.webContents.send('update-downloaded', info)
  })

  // 错误处理
  autoUpdater.on('error', (err) => {
    console.error('Update error:', err)
    mainWindow.webContents.send('update-error', err)
  })

  // 启动时检查更新
  setTimeout(() => {
    autoUpdater.checkForUpdates()
  }, 3000)
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Initialize database first
  await initDatabase()

  // Initialize built-in presets
  await initializeBuiltInPresets()

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.ding.app')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.on('open-files-ready', () => {
    isRendererReady = true
    if (pendingOpenFiles.size > 0) {
      const queued = Array.from(pendingOpenFiles)
      pendingOpenFiles.clear()
      sendOpenFiles(queued)
    }
  })

  // Show item in folder
  ipcMain.handle('show-in-folder', (_event, filePath: string) => {
    shell.showItemInFolder(filePath)
  })

  ipcMain.handle('get-database-path', () => {
    return getDatabasePath()
  })

  // Get app version
  ipcMain.handle('get-app-version', () => {
    return packageInfo.version
  })

  ipcMain.handle('read-file', async (_event, filePath: string) => {
    const buffer = await fs.readFile(filePath)
    return {
      name: basename(filePath),
      mimeType: getMimeTypeFromPath(filePath),
      data: buffer
    }
  })

  const mainWindow = createWindow()
  mainWindow.webContents.on('did-finish-load', () => {
    if (pendingOpenFiles.size > 0 && isRendererReady) {
      const queued = Array.from(pendingOpenFiles)
      pendingOpenFiles.clear()
      sendOpenFiles(queued)
    }
  })

  handleOpenFiles(getOpenFileArgs(process.argv))

  // Setup tRPC IPC handler
  createIPCHandler({ router: appRouter, windows: [mainWindow] })

  // Setup auto-updater
  setupAutoUpdater(mainWindow)

  // IPC handler for manual update check
  ipcMain.handle('check-for-updates', async () => {
    if (is.dev) {
      return { error: 'Updates are disabled in development mode' }
    }

    return new Promise((resolve) => {
      let resolved = false
      let timeout: NodeJS.Timeout

      const onUpdateAvailable = (info: any) => {
        if (!resolved) {
          resolved = true
          clearTimeout(timeout)
          cleanup()
          resolve({ success: true, updateInfo: info })
        }
      }

      const onUpdateNotAvailable = (_info: any) => {
        if (!resolved) {
          resolved = true
          clearTimeout(timeout)
          cleanup()
          resolve({ success: true, updateInfo: null })
        }
      }

      const onError = (error: Error) => {
        if (!resolved) {
          resolved = true
          clearTimeout(timeout)
          cleanup()
          resolve({ error: error.message })
        }
      }

      const cleanup = () => {
        autoUpdater.removeListener('update-available', onUpdateAvailable)
        autoUpdater.removeListener('update-not-available', onUpdateNotAvailable)
        autoUpdater.removeListener('error', onError)
      }

      // 设置超时
      timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true
          cleanup()
          resolve({ error: 'Update check timed out' })
        }
      }, 30000) // 30秒超时

      // 监听事件
      autoUpdater.once('update-available', onUpdateAvailable)
      autoUpdater.once('update-not-available', onUpdateNotAvailable)
      autoUpdater.once('error', onError)

      // 开始检查更新
      autoUpdater.checkForUpdates().catch((error) => {
        if (!resolved) {
          resolved = true
          cleanup()
          clearTimeout(timeout)
          resolve({ error: String(error) })
        }
      })
    })
  })

  // IPC handler for installing update
  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall(true, true)
  })

  // IPC handler for downloading update
  ipcMain.handle('download-update', () => {
    autoUpdater.downloadUpdate()
  })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
