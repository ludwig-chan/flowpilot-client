import { ElectronAPI } from '@electron-toolkit/preload'

interface AppConfig {
  extensionDir: string
  remoteUrl: string
  checkIntervalHours: number
  currentVersion: string
}

interface UpdateStatus {
  hasUpdate: boolean
  latestVersion: string
  currentVersion: string
  releaseName?: string
}

interface BackupEntry {
  date: string
  path: string
}

interface BrowserInfo {
  id: string
  name: string
  exePath: string
}

interface FlowPilotAPI {
  getConfig: () => Promise<AppConfig>
  saveConfig: (config: AppConfig) => Promise<boolean>
  openDirDialog: () => Promise<string | null>
  openInExplorer: (dirPath: string) => Promise<void>
  checkUpdate: () => Promise<UpdateStatus>
  doUpdate: () => Promise<{ success: boolean; backupPath?: string; newVersion?: string; error?: string }>
  listBackups: () => Promise<BackupEntry[]>
  restoreBackup: (backupPath: string) => Promise<{ success: boolean; error?: string }>
  detectBrowsers: () => Promise<BrowserInfo[]>
  openBrowserExtPage: (browserId: string) => Promise<{ success: boolean; error?: string }>
  loadExtensionAuto: (browserId: string) => Promise<{ success: boolean; error?: string }>
  onUpdateStatus: (cb: (status: UpdateStatus) => void) => () => void
  onDownloadProgress: (cb: (data: { percent: number }) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: FlowPilotAPI
  }
}
