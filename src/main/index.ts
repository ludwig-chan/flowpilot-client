import { app, BrowserWindow, Notification } from 'electron'
import { join } from 'path'
import { cpSync, existsSync, readdirSync, readFileSync, mkdirSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { createTray } from './tray'
import { registerIpcHandlers } from './ipc'
import { checkForUpdate } from './updater'
import { loadConfig, saveConfig } from './config'

let mainWindow: BrowserWindow | null = null
let updateCheckTimer: ReturnType<typeof setInterval> | null = null

function createWindow(): BrowserWindow {
  const iconPath = is.dev
    ? join(process.cwd(), 'resources', 'icon.png')
    : join(process.resourcesPath, 'icon.png')

  const win = new BrowserWindow({
    width: 780,
    height: 560,
    minWidth: 680,
    minHeight: 480,
    show: false,
    autoHideMenuBar: true,
    title: 'FlowPilot Client',
    icon: iconPath,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  win.on('ready-to-show', () => win.show())

  win.on('close', (e) => {
    if (!(app as typeof app & { isQuitting: boolean }).isQuitting) {
      e.preventDefault()
      win.hide()
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

/** 首次运行时将内置插件复制到 extensionDir */
function initBundledExtension(): void {
  const config = loadConfig()
  const { extensionDir } = config
  const isEmpty = !existsSync(extensionDir) || readdirSync(extensionDir).length === 0
  if (!isEmpty) return

  const bundledPath = is.dev
    ? join(process.cwd(), 'resources', 'extension')
    : join(process.resourcesPath, 'extension')

  if (!existsSync(bundledPath)) return

  try {
    mkdirSync(extensionDir, { recursive: true })
    cpSync(bundledPath, extensionDir, { recursive: true })
    const manifestPath = join(extensionDir, 'manifest.json')
    if (existsSync(manifestPath) && !config.currentVersion) {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      if (manifest.version) {
        config.currentVersion = `v${manifest.version}`
        saveConfig(config)
      }
    }
  } catch {
    // 首次复制失败静默忽略
  }
}

async function runUpdateCheck(win: BrowserWindow): Promise<void> {
  try {
    const status = await checkForUpdate()
    if (!win.isDestroyed()) {
      win.webContents.send('update-status', status)
    }
    if (status.hasUpdate && Notification.isSupported()) {
      new Notification({
        title: 'FlowPilot 有新版本',
        body: `发现新版本 ${status.latestVersion}，请打开客户端更新`
      }).show()
    }
  } catch {
    // 网络错误静默忽略
  }
}

function startUpdateTimer(win: BrowserWindow, intervalHours: number): void {
  if (updateCheckTimer) clearInterval(updateCheckTimer)
  const ms = Math.max(intervalHours, 0.1) * 60 * 60 * 1000
  updateCheckTimer = setInterval(() => runUpdateCheck(win), ms)
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.flowpilot.client')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 首次运行：将内置插件复制到用户目录
  initBundledExtension()

  mainWindow = createWindow()
  registerIpcHandlers(mainWindow)

  createTray(mainWindow, () => {
    if (mainWindow && !mainWindow.isDestroyed()) runUpdateCheck(mainWindow)
  })

  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) runUpdateCheck(mainWindow)
  }, 3000)

  const cfg = loadConfig()
  startUpdateTimer(mainWindow!, cfg.checkIntervalHours)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow()
    } else {
      mainWindow?.show()
    }
  })
})

app.on('before-quit', () => {
  ;(app as typeof app & { isQuitting: boolean }).isQuitting = true
})

app.on('window-all-closed', () => {
  if (process.platform === 'darwin') app.quit()
})
