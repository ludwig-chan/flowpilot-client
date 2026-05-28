import React, { useState, useEffect } from 'react'

interface AppConfig {
  extensionDir: string
  remoteUrl: string
  checkIntervalHours: number
  currentVersion: string
}

interface SettingsProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

export default function Settings({ showToast }: SettingsProps): React.JSX.Element {
  const [config, setConfig] = useState<AppConfig>({
    extensionDir: '',
    remoteUrl: '',
    checkIntervalHours: 1,
    currentVersion: 'v0.0.0'
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    window.api.getConfig().then(setConfig)
  }, [])

  const handleBrowse = async (): Promise<void> => {
    const dir = await window.api.openDirDialog()
    if (dir) setConfig((prev) => ({ ...prev, extensionDir: dir }))
  }

  const handleSave = async (): Promise<void> => {
    if (!config.extensionDir.trim()) {
      showToast('请先设置插件安装目录', 'error')
      return
    }
    setSaving(true)
    try {
      await window.api.saveConfig(config)
      showToast('设置已保存', 'success')
    } catch {
      showToast('保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="page-title">设置</div>

      <div className="card">
        <div className="card-title">插件目录</div>

        <div className="form-group">
          <label className="form-label">插件安装目录</label>
          <div className="input-row">
            <input
              className="form-input"
              type="text"
              value={config.extensionDir}
              onChange={(e) => setConfig((prev) => ({ ...prev, extensionDir: e.target.value }))}
              placeholder="例：C:\FlowPilot\extension"
            />
            <button className="btn btn-secondary" onClick={handleBrowse}>
              浏览…
            </button>
            {config.extensionDir && (
              <button
                className="btn btn-secondary"
                onClick={() => window.api.openInExplorer(config.extensionDir)}
              >
                📂
              </button>
            )}
          </div>
          <div className="form-hint">
            浏览器加载插件时，直接指向此目录（解压目录，包含 manifest.json）
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">更新源</div>

        <div className="form-group">
          <label className="form-label">Gitee Release API 地址</label>
          <input
            className="form-input"
            type="url"
            value={config.remoteUrl}
            onChange={(e) => setConfig((prev) => ({ ...prev, remoteUrl: e.target.value }))}
            placeholder="https://gitee.com/api/v5/repos/{owner}/{repo}/releases/latest"
          />
          <div className="form-hint">
            格式：https://gitee.com/api/v5/repos/用户名/仓库名/releases/latest
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">自动检查间隔</label>
          <select
            className="form-select"
            value={config.checkIntervalHours}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, checkIntervalHours: Number(e.target.value) }))
            }
          >
            <option value={0.5}>每 30 分钟</option>
            <option value={1}>每 1 小时</option>
            <option value={2}>每 2 小时</option>
            <option value={6}>每 6 小时</option>
            <option value={24}>每天</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="card-title">版本信息</div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">当前记录版本</label>
          <input
            className="form-input"
            type="text"
            value={config.currentVersion}
            onChange={(e) => setConfig((prev) => ({ ...prev, currentVersion: e.target.value }))}
            placeholder="v0.0.0"
            style={{ maxWidth: 160 }}
          />
          <div className="form-hint">
            首次使用时填入当前已安装的插件版本号，格式如 v1.0.0
          </div>
        </div>
      </div>

      <div className="save-row">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? '保存中…' : '保存设置'}
        </button>
      </div>
    </>
  )
}
