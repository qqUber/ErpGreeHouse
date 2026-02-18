import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))
const buildId = process.env.GIT_SHA || process.env.BUILD_ID || ''

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_ID__: JSON.stringify(buildId)
  },
  esbuild: {
    drop: ['console', 'debugger']
  },
  server: {
    port: 5173,
    strictPort: true
  }
})
