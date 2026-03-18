import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));
const buildId = process.env.GIT_SHA || process.env.BUILD_ID || '';

export default defineConfig({
  plugins: [react()],
  // Use '/' for dev mode, '/admin/' for production build
  base: process.env.NODE_ENV === 'development' ? '/' : '/admin/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_ID__: JSON.stringify(buildId),
  },
  esbuild: {
    // drop: ['console', 'debugger']
  },
  server: {
    port: 5173,
    strictPort: true,
    allowedHosts: ['frontend-e2e', 'frontend', 'localhost', 'host.docker.internal'],
    proxy: {
      '/api': {
        target: process.env.E2E_API_BASE_URL || 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        // Configure proxy to pass cookies
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Forward cookies from the original request
            const cookie = req.headers.cookie;
            if (cookie) {
              proxyReq.setHeader('cookie', cookie);
            }
          });
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
});
