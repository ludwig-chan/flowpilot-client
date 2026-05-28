import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron'
import * as path from 'path'
import { is } from '@electron-toolkit/utils'

let tray: Tray | null = null

export function createTray(mainWindow: BrowserWindow, onCheckUpdate: () => void): Tray {
  const iconPath = is.dev
    ? path.join(process.cwd(), 'resources', 'icon.png')
    : path.join(process.resourcesPath, 'icon.png')

  let icon = nativeImage.createEmpty()
  try {
    icon = nativeImage.createFromPath(iconPath)
    if (icon.isEmpty()) icon = nativeImage.createEmpty()
  } catch {
    // 使用空图标回退
  }

  tray = new Tray(icon)
  tray.setToolTip('FlowPilot Client')
  updateTrayMenu(mainWindow, onCheckUpdate)

  tray.on('double-click', () => {
    showMainWindow(mainWindow)
  })

  return tray
}

function showMainWindow(mainWindow: BrowserWindow): void {
  if (mainWindow.isDestroyed()) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

export function updateTrayMenu(mainWindow: BrowserWindow, onCheckUpdate: () => void): void {
  if (!tray) return
  const menu = Menu.buildFromTemplate([
    {
      label: '打开 FlowPilot',
      click: () => showMainWindow(mainWindow)
    },
    {
      label: '检查更新',
      click: () => onCheckUpdate()
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => app.quit()
    }
  ])
  tray.setContextMenu(menu)
}

export function getTray(): Tray | null {
  return tray
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
