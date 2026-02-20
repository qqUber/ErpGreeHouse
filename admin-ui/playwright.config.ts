import { defineConfig } from '@playwright/test'

const uiMode = process.env.E2E_UI_MODE || 'auto'
const isManual = uiMode === 'manual'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: 0,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    channel: process.env.E2E_BROWSER_CHANNEL || undefined,
    headless: !isManual,
    launchOptions: isManual ? { slowMo: Number(process.env.E2E_SLOWMO_MS || 250) } : undefined,
    // Trace: retain on failure for debugging (essential since retries=0)
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off'
  },

  // Run all tests (disable fail-fast for complete results)
  maxFailures: 0,
  // Disable auto-open report on CI or manually
  reporter: [['list'], ['html', { open: 'never' }]],
  
  // Limit workers to 1 to reduce memory usage and avoid OOM
  workers: 1,

  projects: [
    { name: 'smoke', testDir: './e2e/smoke' },
    { name: 'critical', testDir: './e2e/critical' },
    { name: 'functional', testDir: './e2e/functional' },
    { name: 'roles', testDir: './e2e/roles' }
  ]
})
