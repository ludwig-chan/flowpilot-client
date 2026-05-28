import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config: unknown) => ipcRenderer.invoke('save-config', config),
  openDirDialog: () => ipcRenderer.invoke('open-dir-dialog'),
  openInExplorer: (dirPath: string) => ipcRenderer.invoke('open-in-explorer', dirPath),
  checkUpdate: () => ipcRenderer.invoke('check-update'),
  doUpdate: () => ipcRenderer.invoke('do-update'),
  listBackups: () => ipcRenderer.invoke('list-backups'),
  restoreBackup: (backupPath: string) => ipcRenderer.invoke('restore-backup', backupPath),
  detectBrowsers: () => ipcRenderer.invoke('detect-browsers'),
  openBrowserExtPage: (browserId: string) => ipcRenderer.invoke('open-browser-ext-page', browserId),
  loadExtensionAuto: (browserId: string) => ipcRenderer.invoke('load-extension-auto', browserId),
  onUpdateStatus: (cb: (status: unknown) => void) => {
    ipcRenderer.on('update-status', (_e, status) => cb(status))
    return () => ipcRenderer.removeAllListeners('update-status')
  },
  onDownloadProgress: (cb: (data: { percent: number }) => void) => {
    ipcRenderer.on('download-progress', (_e, data) => cb(data))
    return () => ipcRenderer.removeAllListeners('download-progress')
  }
}

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
