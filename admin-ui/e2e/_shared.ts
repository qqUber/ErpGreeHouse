import { test as base, expect, Page, TestInfo } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
// Import i18n utilities
import {
  Auth,
  Clients,
  Common,
  Dashboard,
  Marketing,
  Menu,
  Products,
  Sales,
  setTestLanguage,
  t,
} from './i18n-test';
import { TestIds } from './utils/test-ids';

export { t, Menu, Common, Dashboard, Sales, Clients, Products, Marketing, Auth };

export const test = base;
export { expect } from '@playwright/test';
export { TestIds } from './utils/test-ids';

/**
 * Test credentials - loaded from .test-credentials.json file
 * This file is created by global-setup.ts
 *
 * ⚠️ SECURITY: These credentials ONLY work when:
 * - E2E_TEST_MODE=true in backend
 * - Test API is enabled
 * - NEVER in production!
 */
export interface TestCredentials {
  username: string;
  password: string;
  role: string;
}

export let TEST_CREDENTIALS: Record<string, TestCredentials> = {};

/**
 * Load test credentials from file created by global-setup
 * Call this once at module load time
 */
function loadCredentialsFromFile(): boolean {
  try {
    const credentialsFile = path.join(process.cwd(), 'e2e', '.test-credentials.json');
    if (fs.existsSync(credentialsFile)) {
      const data = JSON.parse(fs.readFileSync(credentialsFile, 'utf-8'));
      TEST_CREDENTIALS = data;
      console.log('[Test] Loaded credentials from file:', Object.keys(TEST_CREDENTIALS).join(', '));
      return true;
    }
  } catch (e) {
    console.log('[Test] Failed to load credentials from file:', e);
  }
  return false;
}

/**
 * Initialize test credentials by fetching from Test API
 * Call this once before running tests
 */
export async function initTestCredentials(page: Page) {
  try {
    // Try to fetch credentials from test API
    const response = await page.request.get('/api/v1/test/credentials', {
      headers: {
        'x-admin-secret': process.env.E2E_ADMIN_SECRET || 'test-secret-key',
      },
    });

    if (response.ok()) {
      const data = await response.json();
      TEST_CREDENTIALS = data.credentials || {
        admin: { username: 'admin', password: 'TestPass123!', role: 'owner' },
        operator: { username: 'operator', password: 'TestPass123!', role: 'operator' },
        manager: { username: 'manager', password: 'TestPass123!', role: 'marketer' },
      };
      console.log('[Test] Loaded credentials from Test API');
    } else {
      // Fallback to default test credentials
      setDefaultCredentials();
      console.log('[Test] Using default test credentials');
    }
  } catch (e) {
    // Fallback to default test credentials
    setDefaultCredentials();
    console.log('[Test] Using default test credentials (API unavailable)');
  }
}

function setDefaultCredentials() {
  TEST_CREDENTIALS = {
    admin: { username: 'admin', password: 'TestPass123!', role: 'owner' },
    operator: { username: 'operator', password: 'TestPass123!', role: 'operator' },
    manager: { username: 'manager', password: 'TestPass123!', role: 'marketer' },
  };
}

// Load credentials from file on module load
loadCredentialsFromFile();

export type TestRole = keyof typeof TEST_CREDENTIALS;

// ============================================================================
// Role-Based Test Fixtures
// ============================================================================

/**
 * Extended test fixture with role-based login helpers
 * Provides clean way to test with different user roles
 */
export interface RoleTestFixtures {
  /**
   * Login as admin (owner) - has full access to all features
   */
  asAdmin: (page: Page) => Promise<void>;
  /**
   * Login as manager (marketer) - has marketing, customers, products, integrations access
   * Cannot access POS operations or Settings
   */
  asManager: (page: Page) => Promise<void>;
  /**
   * Login as operator - has POS and Customers access only
   * Cannot access Integrations, Settings, Marketing, Products
   */
  asOperator: (page: Page) => Promise<void>;
}

/**
 * Create role-based test fixtures
 * These can be used with Playwright's test.extend() to add role-specific login
 */
export function createRoleFixtures() {
  return {
    asAdmin: async (page: Page) => {
      await login(page, 'admin');
    },
    asManager: async (page: Page) => {
      await login(page, 'manager');
    },
    asOperator: async (page: Page) => {
      await login(page, 'operator');
    },
  };
}

/**
 * Get all available role names
 */
export function getAvailableRoles(): string[] {
  return Object.keys(TEST_CREDENTIALS);
}

/**
 * Get credentials for a specific role
 */
export function getCredentials(role: TestRole) {
  return TEST_CREDENTIALS[role];
}

// ============================================================================
// Permission Test Helpers
// ============================================================================

// Type for navigation items
type NavTab =
  | 'dashboard'
  | 'customers'
  | 'pos'
  | 'products'
  | 'marketing'
  | 'integrations'
  | 'settings'
  | 'compliance'
  | 'analytics';

// Role name type
type RoleName = 'owner' | 'marketer' | 'operator';

/**
 * Navigation items available to each role
 */
export const RolePermissions = {
  /**
   * Owner/Admin - has access to everything
   */
  owner: {
    tabs: [
      'dashboard',
      'customers',
      'pos',
      'products',
      'marketing',
      'integrations',
      'settings',
      'compliance',
      'analytics',
    ],
    apiAccess: [
      'dashboard',
      'customers',
      'products',
      'pos',
      'integrations',
      'marketing',
      'settings',
      'compliance',
      'analytics',
    ],
  },
  /**
   * Manager/Marketer - has marketing, customers, products, integrations
   * Cannot access POS operations or Settings
   */
  marketer: {
    tabs: ['dashboard', 'customers', 'products', 'marketing', 'integrations'],
    apiAccess: ['dashboard', 'customers', 'products', 'marketing', 'integrations'],
  },
  /**
   * Operator - has POS and Customers only
   * Cannot access Integrations, Settings, Marketing, Products
   */
  operator: {
    tabs: ['customers', 'pos'],
    apiAccess: ['customers', 'pos'],
  },
} as const satisfies Record<RoleName, { tabs: readonly NavTab[]; apiAccess: readonly string[] }>;

// Type for navigation items that exist in TestIds.nav
type NavItemKey = keyof typeof TestIds.nav;

/**
 * Verify that a specific navigation tab is visible for a role
 * Throws if visibility doesn't match expected state
 */
export async function expectNavVisible(
  page: Page,
  navItem: NavItemKey,
  role: TestRole,
  shouldBeVisible: boolean
): Promise<void> {
  const roleKey = role === 'admin' ? 'owner' : role === 'manager' ? 'marketer' : 'operator';
  const permissions = RolePermissions[roleKey];
  const isAllowed = (permissions.tabs as readonly string[]).includes(navItem);

  const testId = TestIds.nav[navItem];
  if (!testId) {
    throw new Error(`Unknown nav item: ${navItem}`);
  }

  const locator = page.getByTestId(testId);

  if (shouldBeVisible && isAllowed) {
    // Should be visible - user has permission
    await expect(locator).toBeVisible();
  } else if (!shouldBeVisible && !isAllowed) {
    // Should not be visible - user lacks permission
    await expect(locator).toHaveCount(0);
  }
  // Otherwise: user has permission but we expect not visible (or vice versa) - that's a test error
}

/**
 * Verify that all tabs in the permissions list are visible for a role
 */
export async function expectAllTabsVisible(page: Page, role: TestRole): Promise<void> {
  const roleKey = role === 'admin' ? 'owner' : role === 'manager' ? 'marketer' : 'operator';
  const permissions = RolePermissions[roleKey];

  for (const tab of permissions.tabs) {
    const testId = TestIds.nav[tab as NavItemKey];
    if (testId) {
      await expect(page.getByTestId(testId)).toBeVisible();
    }
  }
}

/**
 * Verify that tabs NOT in the permissions list are hidden for a role
 */
export async function expectNoUnauthorizedTabs(page: Page, role: TestRole): Promise<void> {
  const roleKey = role === 'admin' ? 'owner' : role === 'manager' ? 'marketer' : 'operator';
  const permissions = RolePermissions[roleKey];

  const allTabs: NavItemKey[] = [
    'dashboard',
    'customers',
    'pos',
    'products',
    'marketing',
    'integrations',
    'settings',
    'compliance',
    'analytics',
  ];
  const unauthorizedTabs = allTabs.filter(
    (tab) => !(permissions.tabs as readonly string[]).includes(tab)
  );

  for (const tab of unauthorizedTabs) {
    const testId = TestIds.nav[tab];
    if (testId) {
      await expect(page.getByTestId(testId)).toHaveCount(0);
    }
  }
}

/**
 * Verify API returns expected status based on role permissions
 * @param page - Playwright page for making requests
 * @param apiPath - API endpoint path (e.g., '/api/v1/integrations')
 * @param role - User role to test
 * @param method - HTTP method (GET, POST, etc.)
 * @param expectedStatus - Expected status: 200/201 for allowed, 401/403 for denied
 * @param requestData - Optional request body for POST/PUT
 */
export async function expectApiAccess(
  page: Page,
  apiPath: string,
  role: TestRole,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  expectedStatus: number,
  requestData?: Record<string, unknown>
): Promise<void> {
  // First login as the role
  await login(page, role);
  await page.waitForTimeout(1000);

  // Make the API request
  const options: { headers?: Record<string, string>; data?: Record<string, unknown> } = {};

  const response =
    method === 'GET'
      ? await page.request.get(apiPath, options)
      : method === 'POST'
        ? await page.request.post(apiPath, { data: requestData })
        : method === 'PUT'
          ? await page.request.put(apiPath, { data: requestData })
          : await page.request.delete(apiPath);

  expect(response.status()).toBe(expectedStatus);
}

/**
 * Quick helper to check if role has permission for a specific feature
 */
export function hasPermission(role: TestRole, feature: string): boolean {
  const roleKey = role === 'admin' ? 'owner' : role === 'manager' ? 'marketer' : 'operator';
  return (RolePermissions[roleKey].apiAccess as readonly string[]).includes(feature);
}

/**
 * Login helper with proper error handling and waiting
 * Uses credentials from TEST_CREDENTIALS (fetched from DB)
 */
export async function login(page: Page, role: TestRole = 'admin') {
  const creds = TEST_CREDENTIALS[role];

  if (!creds) {
    throw new Error(
      `Unknown role: ${role}. Available roles: ${Object.keys(TEST_CREDENTIALS).join(', ')}`
    );
  }

  console.log(`[Test] Logging in as ${role} (${creds.username})`);

  // Login against backend API base and set cookies for frontend origin.
  const appBaseUrl = process.env.E2E_BASE_URL || 'http://localhost:5173';
  const apiBaseUrl = process.env.E2E_API_BASE_URL || 'http://127.0.0.1:8000';
  const loginResponse = await page
    .context()
    .request.post(apiBaseUrl + '/api/v1/public/auth/login', {
      data: {
        username: creds.username,
        password: creds.password,
      },
    });

  if (!loginResponse.ok()) {
    const errorText = await loginResponse.text();
    throw new Error(`Login failed: ${loginResponse.status()} - ${errorText}`);
  }

  // Extract and set cookies from response
  const cookies = loginResponse.headers()['set-cookie'];
  if (cookies) {
    const cookieStrings = Array.isArray(cookies) ? cookies : [cookies];
    for (const cookieStr of cookieStrings) {
      const [nameValuePart, ...paramsParts] = cookieStr.split(';');
      const [name, value] = nameValuePart.trim().split('=');

      // Create minimal valid cookie object
      const cookie: any = {
        name: name,
        value: value,
        url: appBaseUrl,
      };

      try {
        await page.context().addCookies([cookie]);
      } catch (error) {
        console.warn(`Failed to set cookie ${name}:`, error);
      }
    }
  }

  const authData = await loginResponse.json();

  // The API returns either `token` or `access_token` depending on the endpoint
  // JWT tokens are now delivered via httpOnly cookies - NOT in response body
  // Legacy token is returned for backward compatibility
  const token = authData.token || authData.access_token;

  if (!token) {
    throw new Error(`Login response missing token: ${JSON.stringify(authData)}`);
  }

  // DUAL-MODE AUTHENTICATION FOR TESTS:
  //
  // Mode 1 (Preferred): Use httpOnly cookies set by login response
  // - The login API sets access_token and refresh_token as httpOnly cookies
  // - Browser automatically sends these cookies with subsequent requests
  //
  // Mode 2 (Fallback): Use x-admin-secret header for legacy/demo authentication
  // - Set the token in x-admin-secret header for API calls
  // - This works for demo mode and testing without cookies
  //
  // SECURITY NOTE: We no longer store JWT in localStorage for tests.
  // This is more secure and matches production behavior.

  // Set up init script for language preference only
  // Do NOT set admin_session_token in localStorage - use httpOnly cookies instead
  // IMPORTANT: Set language to English as the default for tests
  await page.addInitScript(() => {
    window.sessionStorage.setItem('auth_validation_state', 'valid');
    window.localStorage.setItem('language', 'en');
  });

  // Set the test i18n language to match what we configured in the app
  setTestLanguage('en');

  // Open explicit admin entrypoint to avoid blank root page in preview/proxy environments.
  await page.goto('/admin/');

  // Wait for app to fully load
  await page.waitForLoadState('domcontentloaded');

  // Wait for navigation shell to appear.
  try {
    await page.waitForSelector('[data-testid^="admin_nav_"]', { timeout: 15000 });
  } catch {
    const currentUrl = page.url();
    const availableTestIds = await page
      .evaluate(() =>
        Array.from(document.querySelectorAll('[data-testid]'))
          .map((el) => el.getAttribute('data-testid'))
          .filter(Boolean)
      )
      .catch(() => []);
    console.warn(
      `[Test] Navigation shell not detected after login. URL=${currentUrl}; testIds=${JSON.stringify(availableTestIds)}`
    );
  }

  console.log(`[Test] Successfully logged in as ${role}`);
}

export async function maybePause(page: Page, label: string) {
  const pause = process.env.E2E_PAUSE === '1' || process.env.E2E_PAUSE === 'true';
  if (!pause) return;
  await page.pause();
  await page
    .getByText(label)
    .count()
    .catch(() => {});
}

export function attachConsole(page: Page, testInfo: TestInfo) {
  const lines: string[] = [];
  page.on('console', (msg) => {
    try {
      lines.push(`[${msg.type()}] ${msg.text()}`);
    } catch {}
  });
  page.on('pageerror', (err) => {
    lines.push(`[pageerror] ${String(err)}`);
  });

  return async () => {
    if (!lines.length) return;
    await testInfo.attach('console.log', { body: lines.join('\n'), contentType: 'text/plain' });
  };
}

export async function retryBackoff(testInfo: TestInfo) {
  if (!testInfo.retry) return;
  const baseMs = Number(process.env.E2E_RETRY_BASE_MS || 750);
  const delay = Math.min(30_000, baseMs * 2 ** (testInfo.retry - 1));
  await new Promise((resolve) => setTimeout(resolve, delay));
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
        'x-admin-secret': process.env.E2E_ADMIN_SECRET || 'test-secret-key',
      },
    });

    if (response.ok()) {
      console.log('[Test] Database reset successfully');
    } else {
      console.warn('[Test] Database reset failed:', await response.text());
    }
  } catch (e) {
    console.warn('[Test] Database reset error:', e);
  }
}

// ============================================================================
// Data-testid Helper Functions
// ============================================================================

/**
 * Get a clean data-testid selector for a specific element without language suffixes.
 * Pattern: {prefix}_{element}, e.g., 'login_input_username'
 *
 * @param prefix - Component prefix (e.g., 'login', 'nav', 'dashboard')
 * @param element - Element identifier (e.g., 'input_username', 'item_dashboard')
 * @returns The clean data-testid string
 */
export function getCleanTestId(prefix: string, element: string): string {
  return `${prefix}_${element}`;
}

/**
 * Get a data-testid locator for navigation elements
 * Common patterns: nav_item_dashboard, nav_item_customers, etc.
 */
export function getNavTestId(page: Page, navItem: string) {
  return page.getByTestId(`nav_item_${navItem}`);
}

/**
 * Get a data-testid locator for button elements
 * Common patterns: login_btn_submit, customer_btn_new, etc.
 */
export function getButtonTestId(page: Page, prefix: string, buttonName: string) {
  return page.getByTestId(`${prefix}_btn_${buttonName}`);
}

/**
 * Get a data-testid locator for input elements
 * Common patterns: login_input_username, customer_input_search, etc.
 */
export function getInputTestId(page: Page, prefix: string, inputName: string) {
  return page.getByTestId(`${prefix}_input_${inputName}`);
}

/**
 * Get a data-testid locator for view/container elements
 * Common patterns: dashboard_view, customers_view, etc.
 */
export function getViewTestId(page: Page, viewName: string) {
  return page.getByTestId(`${viewName}_view`);
}
