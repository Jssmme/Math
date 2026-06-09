import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/global.css'

let shown = false

async function showWindow() {
  if (shown) return
  shown = true
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().show()
  } catch (_) {}
}

setTimeout(() => {
  if (!shown) showWindow()
}, 5000)

const root = ReactDOM.createRoot(document.getElementById('root'))

root.render(
  <React.StrictMode>
    <App onReady={() => { showWindow() }} />
  </React.StrictMode>
)
