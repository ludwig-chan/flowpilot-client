import React, { useState, useEffect, useCallback } from 'react'
import Home from './pages/Home'
import Settings from './pages/Settings'
import Tutorial from './pages/Tutorial'

type Page = 'home' | 'settings' | 'tutorial'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

export default function App(): React.JSX.Element {
  const [page, setPage] = useState<Page>('home')
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000)
  }, [])

  useEffect(() => {
    const off = window.api.onUpdateStatus((status) => {
      if (status.hasUpdate) {
        showToast(`发现新版本 ${status.latestVersion}，请前往主页更新`, 'info')
      }
    })
    return off
  }, [showToast])

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">F</div>
          FlowPilot
        </div>
        <nav>
          <div
            className={`nav-item ${page === 'home' ? 'active' : ''}`}
            onClick={() => setPage('home')}
          >
            <span className="nav-icon">🏠</span> 主页
          </div>
          <div
            className={`nav-item ${page === 'settings' ? 'active' : ''}`}
            onClick={() => setPage('settings')}
          >
            <span className="nav-icon">⚙️</span> 设置
          </div>
          <div
            className={`nav-item ${page === 'tutorial' ? 'active' : ''}`}
            onClick={() => setPage('tutorial')}
          >
            <span className="nav-icon">📖</span> 安装教程
          </div>
        </nav>
      </aside>

      <main className="content">
        {page === 'home' && <Home showToast={showToast} />}
        {page === 'settings' && <Settings showToast={showToast} />}
        {page === 'tutorial' && <Tutorial showToast={showToast} />}
      </main>

      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  )
}

