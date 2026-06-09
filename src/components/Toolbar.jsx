import { useCallback, useState, useEffect, useRef } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'

const SNIPPETS = [
  { label: '今天', value: 'today' },
  { label: '变量', value: 'x = ' },
  { label: '平均', value: 'mean(' },
  { label: '% 折', value: ' * 0.8' },
]

function formatRateTime(date) {
  if (!date) return ''
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  return `${days}天前`
}

export default function Toolbar({ onInsert, onClear, rateStatus, rateUpdatedAt, onSumInsert, onRateRefresh, rateFlash }) {
  const [flashActive, setFlashActive] = useState(false)
  const [alwaysOnTop, setAlwaysOnTop] = useState(false)

  // Flash animation when rateFlash increments
  useEffect(() => {
    if (rateFlash > 0) {
      setFlashActive(true)
      const t = setTimeout(() => setFlashActive(false), 600)
      return () => clearTimeout(t)
    }
  }, [rateFlash])

  const rateLabel = (() => {
    if (rateStatus === 'loading') return '汇率 刷新中…'
    if (rateStatus === 'offline') return '汇率离线'
    if (rateUpdatedAt) return `汇率 ${formatRateTime(rateUpdatedAt)}`
    return '汇率'
  })()

  const handleRateClick = useCallback(() => {
    if (onRateRefresh) onRateRefresh()
  }, [onRateRefresh])

  const handleMinimize = useCallback(async () => {
    const w = getCurrentWindow()
    await w.minimize()
  }, [])

  const handleToggleAlwaysOnTop = useCallback(async () => {
    const w = getCurrentWindow()
    const next = !alwaysOnTop
    await w.setAlwaysOnTop(next)
    setAlwaysOnTop(next)
  }, [alwaysOnTop])

  const handleClose = useCallback(async () => {
    const w = getCurrentWindow()
    await w.close()
  }, [])

  const dragging = useRef(false)

  const handleMouseDown = useCallback(async (e) => {
    if (e.button !== 0) return
    if (e.target.closest('button')) return
    if (dragging.current) return
    dragging.current = true
    try {
      const w = getCurrentWindow()
      await w.startDragging()
    } finally {
      dragging.current = false
    }
  }, [])

  return (
    <div className="toolbar" style={styles.toolbar} onMouseDown={handleMouseDown}>
      <span style={styles.title}>计算稿纸</span>

      <div style={styles.snippets}>
        {SNIPPETS.map(s => (
          <button key={s.label} style={styles.btn} onClick={() => onInsert(s.value)}>
            {s.label}
          </button>
        ))}
        <button style={styles.btn} onClick={onSumInsert}>求和</button>
      </div>

      <div style={styles.right}>
        <span
          style={{
            ...styles.rateLabel,
            cursor: 'pointer',
            transition: 'opacity 0.15s',
            opacity: flashActive ? 0.3 : 1,
          }}
          onClick={handleRateClick}
          title="点击刷新汇率"
        >
          {rateLabel}
        </span>
        <button style={{ ...styles.btn, ...styles.clearBtn }} onClick={onClear}>清空</button>
      </div>

      <div style={styles.windowControls}>
        <button
          style={alwaysOnTop ? { ...styles.winBtn, ...styles.winBtnActive } : styles.winBtn}
          onClick={handleToggleAlwaysOnTop}
          title="窗口置顶"
        >
          📌
        </button>
        <button style={styles.winBtn} onClick={handleMinimize} title="最小化">─</button>
        <button style={{ ...styles.winBtn, ...styles.closeBtn }} onClick={handleClose} title="关闭">✕</button>
      </div>
    </div>
  )
}

const styles = {
  toolbar: {
    height: 36,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '0 12px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-toolbar)',
  },
  title: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-sans)',
    marginRight: 8,
    letterSpacing: '0.02em',
  },
  snippets: {
    display: 'flex',
    gap: 4,
    flex: 1,
  },
  btn: {
    border: '1px solid var(--border)',
    borderRadius: 4,
    padding: '2px 9px',
    fontSize: 12,
    color: 'var(--text-secondary)',
    background: 'var(--bg-panel)',
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
    transition: 'background 0.1s, color 0.1s',
  },
  clearBtn: {
    background: 'transparent',
    borderColor: 'transparent',
    color: 'var(--text-muted)',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginLeft: 'auto',
  },
  rateLabel: {
    fontSize: 11,
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-sans)',
  },
  windowControls: {
    display: 'flex',
    alignItems: 'center',
    marginLeft: 8,
    gap: 2,
  },
  winBtn: {
    border: 'none',
    background: 'transparent',
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    fontSize: 13,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'background 0.1s',
    fontFamily: 'var(--font-sans)',
    lineHeight: 1,
  },
  winBtnActive: {
    background: 'var(--accent)',
    color: '#fff',
  },
  closeBtn: {
    fontSize: 12,
    fontWeight: 600,
  },
}
