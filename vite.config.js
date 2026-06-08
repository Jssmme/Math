import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://v2.tauri.app/start/frontend/vite/
export default defineConfig({
  plugins: [react()],

  // 防止 Vite 遮盖 Rust 的错误信息
  clearScreen: false,

  // Tauri 期望固定端口，失败则报错
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // 监听 src-tauri 中的文件变化
      ignored: ['**/src-tauri/**'],
    },
  },
})
