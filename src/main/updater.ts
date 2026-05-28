import * as https from 'https'
import * as http from 'http'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import AdmZip from 'adm-zip'
import { loadConfig, saveConfig, AppConfig } from './config'

export interface ReleaseInfo {
  tagName: string
  downloadUrl: string
  releaseName: string
}

export interface UpdateStatus {
  hasUpdate: boolean
  latestVersion: string
  currentVersion: string
  releaseName?: string
}

function httpGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    const req = protocol.get(
      url,
      {
        headers: {
          'User-Agent': 'flowpilot-client/1.0',
          Accept: 'application/json'
        }
      },
      (res) => {
        // Follow redirects (max 5)
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          httpGet(res.headers.location).then(resolve).catch(reject)
          res.resume()
          return
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${url}`))
          res.resume()
          return
        }
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => resolve(data))
        res.on('error', reject)
      }
    )
    req.on('error', reject)
    req.setTimeout(15000, () => {
      req.destroy(new Error('Request timeout'))
    })
  })
}

function downloadFile(
  url: string,
  destPath: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    const req = protocol.get(url, { headers: { 'User-Agent': 'flowpilot-client/1.0' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadFile(res.headers.location, destPath, onProgress).then(resolve).catch(reject)
        res.resume()
        return
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Download failed HTTP ${res.statusCode}`))
        res.resume()
        return
      }
      const total = parseInt(res.headers['content-length'] || '0', 10)
      let received = 0
      const file = fs.createWriteStream(destPath)
      res.on('data', (chunk) => {
        received += chunk.length
        if (total > 0 && onProgress) {
          onProgress(Math.round((received / total) * 100))
        }
      })
      res.pipe(file)
      file.on('finish', () => file.close(() => resolve()))
      file.on('error', (err) => {
        fs.unlink(destPath, () => {})
        reject(err)
      })
      res.on('error', reject)
    })
    req.on('error', reject)
    req.setTimeout(120000, () => {
      req.destroy(new Error('Download timeout'))
    })
  })
}

/** 从 Gitee latest release API 响应中提取版本信息 */
function parseGiteeRelease(json: string): ReleaseInfo {
  const data = JSON.parse(json)
  const tagName: string = data.tag_name || ''
  const releaseName: string = data.name || tagName
  // 找到第一个 zip 附件
  const assets: Array<{ name: string; browser_download_url: string }> = data.assets || []
  const zipAsset = assets.find((a) => a.name.endsWith('.zip'))
  if (!zipAsset) throw new Error('Release 中未找到 .zip 附件')
  return { tagName, downloadUrl: zipAsset.browser_download_url, releaseName }
}

/** 简单语义版本比较，a > b 返回 true */
function isNewer(a: string, b: string): boolean {
  const parse = (v: string) =>
    v
      .replace(/^v/, '')
      .split('.')
      .map((n) => parseInt(n, 10) || 0)
  const [aMaj, aMin, aPat] = parse(a)
  const [bMaj, bMin, bPat] = parse(b)
  if (aMaj !== bMaj) return aMaj > bMaj
  if (aMin !== bMin) return aMin > bMin
  return aPat > bPat
}

export async function checkForUpdate(): Promise<UpdateStatus> {
  const config = loadConfig()
  if (!config.remoteUrl) {
    return { hasUpdate: false, latestVersion: config.currentVersion, currentVersion: config.currentVersion }
  }
  const raw = await httpGet(config.remoteUrl)
  const release = parseGiteeRelease(raw)
  return {
    hasUpdate: isNewer(release.tagName, config.currentVersion),
    latestVersion: release.tagName,
    currentVersion: config.currentVersion,
    releaseName: release.releaseName
  }
}

function copyDirSync(src: string, dest: string): void {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

function removeDirContents(dir: string): void {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry)
    fs.rmSync(full, { recursive: true, force: true })
  }
}

export interface BackupEntry {
  date: string
  path: string
}

export function listBackups(config?: AppConfig): BackupEntry[] {
  const cfg = config || loadConfig()
  const backupRoot = path.join(path.dirname(cfg.extensionDir), 'backups')
  if (!fs.existsSync(backupRoot)) return []
  return fs
    .readdirSync(backupRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => ({ date: e.name, path: path.join(backupRoot, e.name) }))
    .sort((a, b) => b.date.localeCompare(a.date))
}

export async function performUpdate(
  onProgress?: (percent: number) => void
): Promise<{ success: boolean; backupPath: string; newVersion: string }> {
  const config = loadConfig()
  const raw = await httpGet(config.remoteUrl)
  const release = parseGiteeRelease(raw)

  // 下载 ZIP 到临时目录
  const tmpZip = path.join(os.tmpdir(), `flowpilot-${Date.now()}.zip`)
  await downloadFile(release.downloadUrl, tmpZip, onProgress)

  // 备份现有插件目录
  const today = new Date().toISOString().slice(0, 10)
  const backupRoot = path.join(path.dirname(config.extensionDir), 'backups')
  const backupPath = path.join(backupRoot, today)

  if (fs.existsSync(config.extensionDir)) {
    fs.mkdirSync(backupPath, { recursive: true })
    copyDirSync(config.extensionDir, backupPath)
  }

  // 解压到 extensionDir
  fs.mkdirSync(config.extensionDir, { recursive: true })
  removeDirContents(config.extensionDir)

  const zip = new AdmZip(tmpZip)
  zip.extractAllTo(config.extensionDir, true)

  // 清理临时文件
  fs.unlink(tmpZip, () => {})

  // 更新版本号
  config.currentVersion = release.tagName
  saveConfig(config)

  return { success: true, backupPath, newVersion: release.tagName }
}

export async function restoreBackup(backupPath: string): Promise<void> {
  const config = loadConfig()
  if (!fs.existsSync(backupPath)) throw new Error('备份目录不存在')
  fs.mkdirSync(config.extensionDir, { recursive: true })
  removeDirContents(config.extensionDir)
  copyDirSync(backupPath, config.extensionDir)
}
