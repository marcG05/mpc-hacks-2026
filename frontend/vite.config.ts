import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/engine': {
        target: 'http://api:3000',
        changeOrigin: true,
      },
      '/tuner': {
        target: 'http://tuner:5555',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tuner/, '')
      }
    }
  }
})
