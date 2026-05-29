import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

export interface AppConfig {
  extensionDir: string
  remoteUrl: string
  checkIntervalHours: number
  currentVersion: string
}

const CONFIG_DIR = path.join(app.getPath('userData'), 'flowpilot')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

const DEFAULT_CONFIG: AppConfig = {
  extensionDir: path.join(app.getPath('userData'), 'extension'),
  remoteUrl: 'https://raw.githubusercontent.com/ludwig-chan/flowpilot/main/update.json',
  checkIntervalHours: 1,
  currentVersion: 'v0.0.0'
}

export function loadConfig(): AppConfig {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true })
    }
    if (!fs.existsSync(CONFIG_FILE)) {
      saveConfig(DEFAULT_CONFIG)
      return { ...DEFAULT_CONFIG }
    }
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_CONFIG, ...parsed }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export function saveConfig(config: AppConfig): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
}

/** 从已安装插件目录的 manifest.json 动态读取版本号 */
export function readManifestVersion(extensionDir: string): string {
  try {
    const manifestPath = path.join(extensionDir, 'manifest.json')
    if (!fs.existsSync(manifestPath)) return 'v0.0.0'
    const raw = fs.readFileSync(manifestPath, 'utf-8')
    const manifest = JSON.parse(raw)
    const ver: string = manifest.version || '0.0.0'
    return ver.startsWith('v') ? ver : `v${ver}`
  } catch {
    return 'v0.0.0'
  }
}
