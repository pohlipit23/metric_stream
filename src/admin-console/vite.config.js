import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://admin-console-worker.pohlipit.workers.dev',
        changeOrigin: true,
        secure: true
      },
      '/health': {
        target: 'https://admin-console-worker.pohlipit.workers.dev',
        changeOrigin: true,
        secure: true
      }
    }
  }
})
