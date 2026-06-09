import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/global.css'

// ══════════════════════════════════════════════════════════════
// 启动耗时诊断器 — 每次启动自动记录各阶段耗时并写入剪贴板
// ══════════════════════════════════════════════════════════════
const t0 = performance.now()
const timeline = []
function mark(name) {
  const ms = (performance.now() - t0).toFixed(0)
  timeline.push(`${String(ms).padStart(5)}ms  ${name}`)
}
function buildReport() {
  return (
    `=== Math.mumu 启动耗时分析 ===\n` +
    `时间: ${new Date().toLocaleString()}\n` +
    `基准: main.jsx 模块加载 (0ms)\n\n` +
    timeline.join('\n') +
    `\n\n总计: ${timeline[timeline.length - 1]?.split('ms')[0]?.trim() ?? '?'}ms`
  )
}
function copyReport() {
  const report = buildReport()
  // 同时写剪贴板 + localStorage
  navigator.clipboard.writeText(report).catch(() => {
    const ta = document.createElement('textarea')
    ta.value = report
    ta.style.cssText = 'position:fixed;left:-9999px'
    document.body.appendChild(ta)
    ta.select()
    try { document.execCommand('copy') } catch (_) {}
    document.body.removeChild(ta)
  })
  try { localStorage.setItem('math_mumu_startup_log', report) } catch (_) {}
  return report
}

// 暴露给其他模块使用（App.jsx 中的 mathjs 加载计时等）
window.__startupMark = mark

mark('main.jsx 模块开始执行')

// ══════════════════════════════════════════════════════════════
// 窗口显示逻辑 — 等 React + mathjs 都就绪后才通知 Tauri 显示
// 不再检查 window.__TAURI__（Tauri v2 中不存在），直接 try import
// ══════════════════════════════════════════════════════════════
let shown = false

async function showWindow() {
  if (shown) return
  shown = true

  // 诊断：检查 Tauri v2 真正的全局变量
  const hasInternals = typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__
  mark(`showWindow: __TAURI_INTERNALS__ = ${hasInternals ? '存在' : '不存在'}`)

  mark('showWindow: 尝试 import @tauri-apps/api/window')
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    mark('showWindow: import 成功, 调用 getCurrentWindow().show()')
    await getCurrentWindow().show()
    mark('showWindow: ✅ 窗口已显示')
  } catch (err) {
    mark(`showWindow: ❌ 失败 — ${err.message || err}`)
  }
}

// ══════════════════════════════════════════════════════════════
// 安全兜底: 5 秒后如果窗口还没显示，强制触发
// ══════════════════════════════════════════════════════════════
setTimeout(() => {
  if (!shown) {
    mark('⏰ 安全兜底超时(5s) — 强制显示窗口')
    showWindow()
  }
}, 5000)

// ══════════════════════════════════════════════════════════════
// React 渲染
// ══════════════════════════════════════════════════════════════
mark('React.createRoot 前')
const root = ReactDOM.createRoot(document.getElementById('root'))

mark('root.render 前')
root.render(
  <React.StrictMode>
    <App onReady={() => {
      mark('App.onReady 回调（mathjs 加载完成, React 首帧已渲染）')
      showWindow()
    }} />
  </React.StrictMode>
)
mark('root.render 返回（React 异步渲染已调度）')

// ══════════════════════════════════════════════════════════════
// 延迟复制报告到剪贴板（等 React 渲染和 showWindow 都完成）
// ══════════════════════════════════════════════════════════════
setTimeout(() => {
  mark('⏱ 3s 延迟到，写入剪贴板 + localStorage')
  const report = copyReport()
  console.log(report)
}, 3000)

// Ctrl+Shift+L 快捷键重新复制启动日志
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'L') {
    e.preventDefault()
    const report = buildReport()
    copyReport()
    console.log('启动日志已复制到剪贴板:\n' + report)
  }
})
