import React, { useState, useEffect } from 'react'

interface BrowserInfo {
  id: string
  name: string
  exePath: string
}

interface TutorialProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void
}

export default function Tutorial({ showToast }: TutorialProps): React.JSX.Element {
  const [extensionDir, setExtensionDir] = useState('')
  const [browsers, setBrowsers] = useState<BrowserInfo[]>([])
  const [autoLoading, setAutoLoading] = useState<string | null>(null)

  useEffect(() => {
    window.api.getConfig().then((cfg) => setExtensionDir(cfg.extensionDir))
    window.api.detectBrowsers().then(setBrowsers)
  }, [])

  const copyPath = async (): Promise<void> => {
    if (!extensionDir) return
    await navigator.clipboard.writeText(extensionDir)
    showToast('路径已复制到剪贴板', 'success')
  }

  const openExtPage = async (browser: BrowserInfo): Promise<void> => {
    const result = await window.api.openBrowserExtPage(browser.id)
    if (!result.success) showToast(result.error || '打开失败', 'error')
  }

  const autoLoad = async (browser: BrowserInfo): Promise<void> => {
    setAutoLoading(browser.id)
    const result = await window.api.loadExtensionAuto(browser.id)
    setAutoLoading(null)
    if (result.success) {
      showToast(`已启动 ${browser.name}，请检查插件是否已加载`, 'success')
    } else {
      showToast(result.error || '自动加载失败', 'error')
    }
  }

  return (
    <div>
      <h1 className="page-title">安装教程</h1>

      {/* 插件位置 */}
      <div className="card">
        <div className="card-title">📁 插件文件位置</div>
        <p className="card-desc">以下路径是插件在您电脑上的位置，后续步骤需要用到：</p>
        <div className="path-row">
          <span className="path-text">{extensionDir || '未配置，请前往设置页面配置'}</span>
          {extensionDir && (
            <>
              <button
                onClick={() => window.api.openInExplorer(extensionDir)}
                className="btn btn-sm btn-secondary"
              >
                打开文件夹
              </button>
              <button onClick={copyPath} className="btn btn-sm btn-secondary">
                复制路径
              </button>
            </>
          )}
        </div>
      </div>

      {/* 安装步骤 */}
      <div className="card">
        <div className="card-title">📋 首次安装步骤</div>
        <div className="step-list">
          <div className="step-item">
            <div className="step-number">1</div>
            <div className="step-content">
              <div className="step-title">打开浏览器扩展管理页</div>
              <p>点击下方按钮，浏览器将自动跳转到扩展管理页面：</p>
              <div className="browser-buttons">
                {browsers.length === 0 ? (
                  <p className="text-muted tut-small">
                    未检测到 Chrome 或 Edge，请手动打开浏览器，在地址栏输入{' '}
                    <code>chrome://extensions</code> 或 <code>edge://extensions</code>
                  </p>
                ) : (
                  browsers.map((b) => (
                    <button key={b.id} onClick={() => openExtPage(b)} className="btn btn-primary">
                      打开 {b.name} 扩展页
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="step-item">
            <div className="step-number">2</div>
            <div className="step-content">
              <div className="step-title">开启开发者模式</div>
              <p>
                在扩展管理页面<strong>右上角</strong>
                找到"开发者模式"开关，将其打开（蓝色代表已开启）。
              </p>
            </div>
          </div>

          <div className="step-item">
            <div className="step-number">3</div>
            <div className="step-content">
              <div className="step-title">加载已解压的扩展程序</div>
              <p>
                开发者模式开启后，左上角会出现"
                <strong>加载已解压的扩展程序</strong>"按钮，点击它。
              </p>
              <p>在弹出的文件夹选择框中，选择以下路径：</p>
              <div className="path-hint">
                {extensionDir || '（请先在设置页面配置插件目录）'}
              </div>
            </div>
          </div>

          <div className="step-item">
            <div className="step-number">4</div>
            <div className="step-content">
              <div className="step-title">确认安装成功</div>
              <p>插件卡片出现在扩展列表中，浏览器右上角出现 FlowPilot 图标，即表示安装成功。</p>
            </div>
          </div>
        </div>
      </div>

      {/* 一键自动加载 */}
      {browsers.length > 0 && (
        <div className="card">
          <div className="card-title">⚡ 一键自动加载（高级）</div>
          <p className="card-desc warning-text">
            ⚠️ 需要先<strong>完全关闭所有浏览器窗口</strong>后再点击，否则可能不生效。
          </p>
          <div className="browser-buttons" style={{ marginTop: 12 }}>
            {browsers.map((b) => (
              <button
                key={b.id}
                onClick={() => autoLoad(b)}
                className="btn btn-secondary"
                disabled={autoLoading === b.id}
              >
                {autoLoading === b.id ? (
                  <>
                    <span className="spinner" /> 启动中…
                  </>
                ) : (
                  `自动加载到 ${b.name}`
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 更新指引 */}
      <div className="card">
        <div className="card-title">🔄 如何更新插件</div>
        <div className="step-list">
          <div className="step-item">
            <div className="step-number">1</div>
            <div className="step-content">
              <div className="step-title">在 FlowPilot 客户端执行更新</div>
              <p>
                前往"主页"，点击"检查更新"，有新版本时点击"立即更新"，客户端自动下载并安装。
              </p>
            </div>
          </div>
          <div className="step-item">
            <div className="step-number">2</div>
            <div className="step-content">
              <div className="step-title">在浏览器中刷新插件</div>
              <p>
                更新完成后，打开扩展管理页面（<code>chrome://extensions</code>），找到 FlowPilot
                插件卡片，点击卡片上的<strong>刷新按钮（↻）</strong>使新版本生效。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
