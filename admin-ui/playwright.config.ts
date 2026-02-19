import { defineConfig } from '@playwright/test'

const uiMode = process.env.E2E_UI_MODE || 'auto'
const isManual = uiMode === 'manual'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: Number(process.env.E2E_RETRIES || (process.env.CI ? 2 : 0)),
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    channel: process.env.E2E_BROWSER_CHANNEL || undefined,
    headless: !isManual,
    launchOptions: isManual ? { slowMo: Number(process.env.E2E_SLOWMO_MS || 250) } : undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  reporter: [['list'], ['html', { open: 'never' }], ['allure-playwright']],
  projects: [
    { name: 'smoke', testDir: './e2e/smoke' },
    { name: 'critical', testDir: './e2e/critical' }
  ]
})
