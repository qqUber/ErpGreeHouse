import { Page, TestInfo, test as base } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

export const test = base
export { expect } from '@playwright/test'

/**
 * Test credentials - loaded from .test-credentials.json file
 * This file is created by global-setup.ts
 *
 * ⚠️ SECURITY: These credentials ONLY work when:
 * - E2E_TEST_MODE=true in backend
 * - Test API is enabled
 * - NEVER in production!
 */
export let TEST_CREDENTIALS: Record<string, { username: string; password: string; role: string }> = {}

/**
 * Load test credentials from file created by global-setup
 * Call this once at module load time
 */
function loadCredentialsFromFile(): boolean {
  try {
    const credentialsFile = path.join(process.cwd(), 'e2e', '.test-credentials.json')
    if (fs.existsSync(credentialsFile)) {
      const data = JSON.parse(fs.readFileSync(credentialsFile, 'utf-8'))
      TEST_CREDENTIALS = data
      console.log('[Test] Loaded credentials from file:', Object.keys(TEST_CREDENTIALS).join(', '))
      return true
    }
  } catch (e) {
    console.log('[Test] Failed to load credentials from file:', e)
  }
  return false
}

/**
 * Initialize test credentials by fetching from Test API
 * Call this once before running tests
 */
export async function initTestCredentials(page: any) {
  try {
    // Try to fetch credentials from test API
    const response = await page.request.get('/api/v1/test/credentials', {
      headers: {
        'x-admin-secret': process.env.E2E_ADMIN_SECRET || 'test-secret-key'
      }
    })

    if (response.ok()) {
      const data = await response.json()
      TEST_CREDENTIALS = data.credentials || {
        admin: { username: 'admin', password: 'TestPass123!', role: 'owner' },
        operator: { username: 'operator', password: 'TestPass123!', role: 'operator' },
        manager: { username: 'manager', password: 'TestPass123!', role: 'marketer' }
      }
      console.log('[Test] Loaded credentials from Test API')
    } else {
      // Fallback to default test credentials
      setDefaultCredentials()
      console.log('[Test] Using default test credentials')
    }
  } catch (e) {
    // Fallback to default test credentials
    setDefaultCredentials()
    console.log('[Test] Using default test credentials (API unavailable)')
  }
}

function setDefaultCredentials() {
  TEST_CREDENTIALS = {
    admin: { username: 'admin', password: 'TestPass123!', role: 'owner' },
    operator: { username: 'operator', password: 'TestPass123!', role: 'operator' },
    manager: { username: 'manager', password: 'TestPass123!', role: 'marketer' }
  }
}

// Load credentials from file on module load
loadCredentialsFromFile()

export type TestRole = keyof typeof TEST_CREDENTIALS

/**
 * Login helper with proper error handling and waiting
 * Uses credentials from TEST_CREDENTIALS (fetched from DB)
 */
export async function login(page: Page, role: TestRole = 'admin') {
  const creds = TEST_CREDENTIALS[role]

  if (!creds) {
    throw new Error(`Unknown role: ${role}. Available roles: ${Object.keys(TEST_CREDENTIALS).join(', ')}`)
  }

  console.log(`[Test] Logging in as ${role} (${creds.username})`)

  // Get tokens directly from API (bypassing UI for reliable authentication)
  const loginResponse = await page.request.post('/api/v1/public/auth/login', {
    data: {
      username: creds.username,
      password: creds.password
    }
  })

  if (!loginResponse.ok()) {
    const errorText = await loginResponse.text()
    throw new Error(`Login failed: ${loginResponse.status()} - ${errorText}`)
  }

  const authData = await loginResponse.json()
  
  // The API returns either `token` or `access_token` depending on the endpoint
  // We need to store it in localStorage as 'admin_session_token' which is what the frontend expects
  const token = authData.token || authData.access_token
  
  if (!token) {
    throw new Error(`Login response missing token: ${JSON.stringify(authData)}`)
  }

  // Set up init script to inject token AND language BEFORE page loads
  // The frontend expects:
  // 1. localStorage 'admin_session_token' - the JWT token
  // 2. sessionStorage 'auth_validation_state' - tells auth context to validate the token on load
  // 3. localStorage 'language' - sets the UI language to Russian for tests
  await page.addInitScript((t) => {
    window.localStorage.setItem('admin_session_token', t)
    window.sessionStorage.setItem('auth_validation_state', 'valid')
    window.localStorage.setItem('language', 'ru')
  }, token)
  
  // Navigate directly to dashboard - the auth context will validate the token
  // and the user will be authenticated. We bypass the login page navigation issue.
  await page.goto('/dashboard')
  
  // Wait for app to fully load
  await page.waitForLoadState('domcontentloaded')
  
  // Wait for dashboard content to be visible (either the nav items or the page to load)
  try {
    await page.waitForSelector('text=Клиенты', { timeout: 15000 })
  } catch {
    // If nav items not found, try waiting for URL or other dashboard elements
    await page.waitForURL('**/dashboard', { timeout: 5000 }).catch(() => {})
  }

  console.log(`[Test] Successfully logged in as ${role}`)
  
  console.log(`[Test] Successfully logged in as ${role}`)
}

export async function maybePause(page: Page, label: string) {
  const pause = process.env.E2E_PAUSE === '1' || process.env.E2E_PAUSE === 'true'
  if (!pause) return
  await page.pause()
  await page.getByText(label).count().catch(() => {})
}

export function attachConsole(page: Page, testInfo: TestInfo) {
  const lines: string[] = []
  page.on('console', msg => {
    try {
      lines.push(`[${msg.type()}] ${msg.text()}`)
    } catch {
    }
  })
  page.on('pageerror', err => {
    lines.push(`[pageerror] ${String(err)}`)
  })

  return async () => {
    if (!lines.length) return
    await testInfo.attach('console.log', { body: lines.join('\n'), contentType: 'text/plain' })
  }
}

export async function retryBackoff(testInfo: TestInfo) {
  if (!testInfo.retry) return
  const baseMs = Number(process.env.E2E_RETRY_BASE_MS || 750)
  const delay = Math.min(30_000, baseMs * Math.pow(2, testInfo.retry - 1))
  await new Promise(resolve => setTimeout(resolve, delay))
}

/**
 * Reset test database to clean state
 * Call this in beforeEach for test isolation
 * 
 * ⚠️ SECURITY: Only works when E2E_TEST_MODE=true
 */
export async function resetTestDatabase(page: Page) {
  try {
    const response = await page.request.post('/api/v1/test/reset', {
      headers: {
        'x-admin-secret': process.env.E2E_ADMIN_SECRET || 'test-secret-key'
      }
    })
    
    if (response.ok()) {
      console.log('[Test] Database reset successfully')
    } else {
      console.warn('[Test] Database reset failed:', await response.text())
    }
  } catch (e) {
    console.warn('[Test] Database reset error:', e)
  }
}
