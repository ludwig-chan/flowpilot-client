import React, { useState, useEffect, useCallback } from 'react'

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

interface HomeProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

export default function Home({ showToast }: HomeProps): React.JSX.Element {
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [checking, setChecking] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [backups, setBackups] = useState<BackupEntry[]>([])
  const [extensionDir, setExtensionDir] = useState('')

  const loadData = useCallback(async () => {
    const [cfg, bkList] = await Promise.all([window.api.getConfig(), window.api.listBackups()])
    setExtensionDir(cfg.extensionDir)
    setBackups(bkList)
    setStatus({
      hasUpdate: false,
      latestVersion: cfg.currentVersion,
      currentVersion: cfg.currentVersion
    })
  }, [])

  useEffect(() => {
    loadData()

    const offStatus = window.api.onUpdateStatus((s) => setStatus(s))
    const offProgress = window.api.onDownloadProgress(({ percent }) => setProgress(percent))
    return () => {
      offStatus()
      offProgress()
    }
  }, [loadData])

  const handleCheck = async (): Promise<void> => {
    setChecking(true)
    try {
      const s = await window.api.checkUpdate()
      setStatus(s)
      if (!s.hasUpdate) showToast('已是最新版本', 'success')
    } catch {
      showToast('检查更新失败，请确认远程地址是否正确', 'error')
    } finally {
      setChecking(false)
    }
  }

  const handleUpdate = async (): Promise<void> => {
    setUpdating(true)
    setProgress(0)
    try {
      const result = await window.api.doUpdate()
      if (result.success) {
        showToast(`已成功更新到 ${result.newVersion}`, 'success')
        await loadData()
        setStatus((prev) =>
          prev ? { ...prev, hasUpdate: false, currentVersion: result.newVersion! } : prev
        )
      } else {
        showToast(`更新失败：${result.error}`, 'error')
      }
    } catch (e) {
      showToast(`更新失败：${(e as Error).message}`, 'error')
    } finally {
      setUpdating(false)
      setProgress(0)
    }
  }

  const handleRestore = async (entry: BackupEntry): Promise<void> => {
    if (!confirm(`确认恢复到 ${entry.date} 的备份？当前版本将被覆盖。`)) return
    const result = await window.api.restoreBackup(entry.path)
    if (result.success) {
      showToast(`已恢复到 ${entry.date} 的备份`, 'success')
    } else {
      showToast(`恢复失败：${result.error}`, 'error')
    }
  }

  const statusEl = (() => {
    if (checking) return <span className="status-dot checking"><span className="spinner" /> 检查中…</span>
    if (!status) return <span className="status-dot checking">加载中</span>
    if (status.hasUpdate) return <span className="status-dot has-update">⬆ 有新版本</span>
    return <span className="status-dot up-to-date">✓ 已是最新</span>
  })()

  return (
    <>
      <div className="page-title">主页</div>

      {/* 版本状态卡片 */}
      <div className="card">
        <div className="card-title">版本状态</div>
        <div className="version-row">
          <div className="version-badges">
            <div className="version-badge">
              <span className="label">当前版本</span>
              <span className="value">{status?.currentVersion ?? '—'}</span>
            </div>
            {status?.hasUpdate && (
              <div className="version-badge">
                <span className="label">最新版本</span>
                <span className="value new">{status.latestVersion}</span>
              </div>
            )}
          </div>
          {statusEl}
        </div>

        {updating && (
          <div className="progress-wrap">
            <div className="progress-label">
              <span>正在下载更新…</span>
              <span>{progress}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="btn-group" style={{ marginTop: 16 }}>
          {status?.hasUpdate && (
            <button
              className="btn btn-primary"
              onClick={handleUpdate}
              disabled={updating || checking}
            >
              {updating ? <><span className="spinner" /> 更新中…</> : '⬆ 立即更新'}
            </button>
          )}
          <button
            className="btn btn-secondary"
            onClick={handleCheck}
            disabled={checking || updating}
          >
            {checking ? <><span className="spinner" /> 检查中…</> : '↻ 手动检查更新'}
          </button>
          {extensionDir && (
            <button
              className="btn btn-secondary"
              onClick={() => window.api.openInExplorer(extensionDir)}
            >
              📂 打开插件目录
            </button>
          )}
        </div>
      </div>

      {/* 备份历史 */}
      <div className="card">
        <div className="card-title">备份历史</div>
        {backups.length === 0 ? (
          <div className="empty-tip">暂无备份记录，更新后将自动备份旧版本</div>
        ) : (
          <div className="backup-list">
            {backups.map((b) => (
              <div key={b.date} className="backup-item">
                <div>
                  <div className="backup-date">📦 {b.date}</div>
                  <div className="backup-path">{b.path}</div>
                </div>
                <div className="btn-group">
                  <button className="btn btn-secondary btn-sm" onClick={() => window.api.openInExplorer(b.path)}>
                    查看
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleRestore(b)}>
                    恢复
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
