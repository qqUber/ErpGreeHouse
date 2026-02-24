import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'url';

const uiMode = process.env.E2E_UI_MODE || 'auto';
const isManual = uiMode === 'manual';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000, // Increased for slower CI environments
  expect: { timeout: 20_000 }, // Increased for UI stability
  retries: 1, // Retry failed tests once for stability
  // Global setup runs ONCE before all tests to prepare test data
  globalSetup: fileURLToPath(new URL('./e2e/global-setup.ts', import.meta.url)),
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    channel: process.env.E2E_BROWSER_CHANNEL || undefined,
    headless: !isManual,
    launchOptions: isManual ? { slowMo: Number(process.env.E2E_SLOWMO_MS || 250) } : undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    // Increased timeouts for CI stability
    actionTimeout: 90_000,
    navigationTimeout: 90_000,
  },

  maxFailures: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  workers: 1,

  projects: [
    { name: 'smoke', testDir: './e2e/smoke' },
    { name: 'critical', testDir: './e2e/critical' },
    { name: 'functional', testDir: './e2e/functional' },
    { name: 'roles', testDir: './e2e/roles' },
    { name: 'auth', testDir: './e2e/auth' },
  ],
});
