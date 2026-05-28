import { ipcMain, BrowserWindow, shell, dialog } from 'electron'
import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { loadConfig, saveConfig, AppConfig } from './config'
import {
  checkForUpdate,
  performUpdate,
  listBackups,
  restoreBackup
} from './updater'

const BROWSER_CONFIGS: Record<string, { name: string; paths: string[]; extPage: string }> = {
  chrome: {
    name: 'Google Chrome',
    paths: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ],
    extPage: 'chrome://extensions'
  },
  edge: {
    name: 'Microsoft Edge',
    paths: [
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ],
    extPage: 'edge://extensions'
  }
}

function findBrowserExe(id: string): string | null {
  const cfg = BROWSER_CONFIGS[id]
  if (!cfg) return null
  return cfg.paths.find((p) => existsSync(p)) ?? null
}

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  // 获取配置
  ipcMain.handle('get-config', () => {
    return loadConfig()
  })

  // 保存配置
  ipcMain.handle('save-config', (_event, config: AppConfig) => {
    saveConfig(config)
    return true
  })

  // 选择目录
  ipcMain.handle('open-dir-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: '选择插件安装目录'
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // 在资源管理器中打开目录
  ipcMain.handle('open-in-explorer', (_event, dirPath: string) => {
    shell.openPath(dirPath)
  })

  // 检查更新
  ipcMain.handle('check-update', async () => {
    return await checkForUpdate()
  })

  // 执行更新
  ipcMain.handle('do-update', async () => {
    try {
      const result = await performUpdate((percent) => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send('download-progress', { percent })
        }
      })
      return result
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // 获取备份列表
  ipcMain.handle('list-backups', () => {
    return listBackups()
  })

  // 恢复备份
  ipcMain.handle('restore-backup', async (_event, backupPath: string) => {
    try {
      await restoreBackup(backupPath)
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // 检测已安装的浏览器
  ipcMain.handle('detect-browsers', () => {
    const results: Array<{ id: string; name: string; exePath: string }> = []
    for (const [id, cfg] of Object.entries(BROWSER_CONFIGS)) {
      const exePath = findBrowserExe(id)
      if (exePath) results.push({ id, name: cfg.name, exePath })
    }
    return results
  })

  // 打开浏览器扩展管理页
  ipcMain.handle('open-browser-ext-page', (_event, browserId: string) => {
    const exePath = findBrowserExe(browserId)
    if (!exePath) return { success: false, error: '未检测到该浏览器' }
    const extPage = BROWSER_CONFIGS[browserId]?.extPage
    if (!extPage) return { success: false, error: '未知浏览器类型' }
    try {
      const child = spawn(exePath, [extPage], { detached: true, stdio: 'ignore' })
      child.unref()
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // 自动加载插件（浏览器需已关闭）
  ipcMain.handle('load-extension-auto', (_event, browserId: string) => {
    const cfg = loadConfig()
    const exePath = findBrowserExe(browserId)
    if (!exePath) return { success: false, error: '未检测到该浏览器' }
    try {
      const child = spawn(exePath, [`--load-extension=${cfg.extensionDir}`], {
        detached: true,
        stdio: 'ignore'
      })
      child.unref()
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}
