import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0, // Reduced from 2 to 1 for faster feedback
  workers: process.env.CI ? 2 : undefined, // Increased from 1 to 2 for parallel execution
  reporter: 'html',
  timeout: 30000, // Global test timeout: 30s
  expect: {
    timeout: 10000, // Assertion timeout: 10s
  },
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    locale: 'en-US',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    actionTimeout: 15000, // Action timeout: 15s
    navigationTimeout: 15000, // Navigation timeout: 15s
  },
  projects: [
    {
      name: 'smoke',
      testMatch: '**/smoke/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'critical',
      testMatch: '**/critical/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'loyalty',
      testMatch: '**/loyalty/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Disable webServer for Docker environment - services are started separately
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev -- --host localhost --port 5173',
        url: 'http://localhost:5173/admin/',
        reuseExistingServer: !process.env.CI,
      },
  outputDir: 'test-results',
});
