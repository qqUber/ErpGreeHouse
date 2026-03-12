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

export { Auth, Clients, Common, Dashboard, Marketing, Menu, Products, Sales, t };

export const test = base;
export { expect } from '@playwright/test';

// ============================================================================
// Test ID Constants - Must match the app's actual data-testid values
// ============================================================================

/**
 * Test IDs matching the actual app components
 * Based on E2E_TEST_FIX_PLAN.md
 */
export const TestIds = {
  // Navigation (admin)
  nav: {
    dashboard: 'admin_nav_dashboard_en',
    customers: 'admin_nav_customers_en',
    pos: 'admin_nav_pos_en',
    integrations: 'admin_nav_integrations_en',
    products: 'admin_nav_products_en',
    settings: 'admin_nav_settings_en',
    marketing: 'admin_nav_marketing_en',
    compliance: 'admin_nav_compliance_en',
    analytics: 'admin_nav_analytics_en',
  },

  // Common buttons
  common: {
    btnLogin: 'common_btn_password_login_en',
    btnPasswordLogin: 'common_btn_password_login_en',
    btnKeyLogin: 'common_btn_key_login_en',
    btnRecovery: 'common_btn_recovery_en',
    btnApiStatus: 'common_btn_api_status_en',
    btnTogglePassword: 'common_btn_toggle_password_en',
    btnLogout: 'admin_btn_logout_en',
  },

  // Common inputs
  inputs: {
    username: 'common_input_username_en',
    password: 'common_input_password_en',
    adminKey: 'common_input_admin_key_en',
  },

  // Operator buttons
  operator: {
    btnNewSale: 'operator_btn_new_sale_en',
    btnIdentifyCustomer: 'operator_btn_identify_customer_en',
    btnCatalog: 'operator_btn_catalog_en',
    btnModePhone: 'operator_btn_mode_phone_en',
    btnModeName: 'operator_btn_mode_name_en',
    btnModeQr: 'operator_btn_mode_qr_en',
    btnIdentify: 'operator_btn_identify_en',
    btnReloadProducts: 'operator_btn_reload_products_en',
    btnAddToCart: 'operator_btn_add_to_cart_en',
    btnCompleteSale: 'operator_btn_complete_sale_en',
  },

  // Views/Containers
  views: {
    settings: 'settings_view_en',
    customers: 'customers_view_en',
    products: 'products_view_en',
    pos: 'pos_view_en',
    dashboardRefresh: 'admin_widget_refresh_export_en',
  },

  // Customer elements
  customer: {
    btnNew: 'admin_btn_new_customer_en',
    btnSearch: 'admin_btn_customer_search_en',
    btnReset: 'admin_btn_customer_reset_en',
    btnCreate: 'admin_btn_create_customer_en',
    inputSearch: 'admin_input_customer_search_en',
    inputFullname: 'admin_input_customer_fullname_en',
    inputPhone: 'admin_input_customer_phone_en',
    inputNotes: 'admin_input_customer_notes_en',
  },

  // Product elements
  product: {
    btnReload: 'admin_btn_products_reload_en',
    btnImport: 'admin_btn_products_import_en',
    btnCreate: 'admin_btn_create_product_en',
    inputCode: 'admin_input_product_code_en',
    inputName: 'admin_input_product_name_en',
    inputKind: 'admin_input_product_kind_en',
    inputPrice: 'admin_input_product_price_en',
  },

  // POS elements
  pos: {
    catalog: 'pos_catalog_en',
    cart: 'pos_cart_en',
    loyalty: 'pos_loyalty_en',
    selectProduct: 'operator_select_product_en',
    inputBonus: 'operator_input_bonus_en',
    inputIdentify: 'operator_input_identify_en',
  },

  // Dashboard widgets
  dashboard: {
    btnRefresh: 'admin_btn_dashboard_refresh_en',
    btnExportCsv: 'admin_btn_export_csv_en',
    widgetCustomers: 'admin_widget_customers_en',
    widgetProducts: 'admin_widget_products_en',
    widgetOperational: 'admin_widget_operational_en',
    widgetIntegrations: 'admin_widget_integrations_en',
    widgetMarketing: 'admin_widget_marketing_en',
  },

  // Operator dashboard
  operatorDashboard: {
    root: 'operator_dashboard_en',
    quickActions: 'operator_widget_quick_actions_en',
    shiftStats: 'operator_widget_shift_stats_en',
    recentTransactions: 'operator_widget_recent_transactions_en',
    emptyState: 'operator_widget_empty_state_en',
    btnFirstSale: 'operator_btn_first_sale_en',
    btnNewOperation: 'operator_btn_new_operation_en',
  },

  // Manager dashboard
  managerDashboard: {
    root: 'manager_dashboard_en',
    kpi: 'manager_widget_kpi_en',
    activeCampaigns: 'manager_widget_active_campaigns_en',
    btnManageCampaigns: 'manager_btn_manage_campaigns_en',
    recentEvents: 'manager_widget_recent_events_en',
    btnViewAllEvents: 'manager_btn_view_all_events_en',
    salesTrend: 'manager_widget_sales_trend_en',
    btnAnalytics: 'manager_btn_analytics_en',
    topProducts: 'manager_widget_top_products_en',
  },
} as const;

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
      setDefaultCredentials();
      console.log('[Test] Using default test credentials');
    }
  } catch (e) {
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

export interface RoleTestFixtures {
  asAdmin: (page: Page) => Promise<void>;
  asManager: (page: Page) => Promise<void>;
  asOperator: (page: Page) => Promise<void>;
}

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

export function getAvailableRoles(): string[] {
  return Object.keys(TEST_CREDENTIALS);
}

export function getCredentials(role: TestRole) {
  return TEST_CREDENTIALS[role];
}

// ============================================================================
// Permission Test Helpers
// ============================================================================

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

type RoleName = 'owner' | 'marketer' | 'operator';

export const RolePermissions = {
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
  marketer: {
    tabs: ['dashboard', 'customers', 'products', 'marketing', 'integrations'],
    apiAccess: ['dashboard', 'customers', 'products', 'marketing', 'integrations'],
  },
  operator: {
    tabs: ['customers', 'pos'],
    apiAccess: ['customers', 'pos'],
  },
} as const satisfies Record<RoleName, { tabs: readonly NavTab[]; apiAccess: readonly string[] }>;

type NavItemKey = keyof typeof TestIds.nav;

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
    await expect(locator).toBeVisible();
  } else if (!shouldBeVisible && !isAllowed) {
    await expect(locator).toHaveCount(0);
  }
}

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

export async function expectApiAccess(
  page: Page,
  apiPath: string,
  role: TestRole,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  expectedStatus: number,
  requestData?: Record<string, unknown>
): Promise<void> {
  await login(page, role);
  await page.waitForTimeout(1000);

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

export function hasPermission(role: TestRole, feature: string): boolean {
  const roleKey = role === 'admin' ? 'owner' : role === 'manager' ? 'marketer' : 'operator';
  return (RolePermissions[roleKey].apiAccess as readonly string[]).includes(feature);
}

/**
 * Login helper with proper error handling and waiting
 * Uses credentials from TEST_CREDENTIALS (fetched from DB)
 */
export async function login(page: Page, role: TestRole = 'admin') {
  const resolvedRole =
    TEST_CREDENTIALS[role] != null
      ? role
      : role === 'admin'
        ? ('owner' as TestRole)
        : role === 'manager'
          ? ('marketer' as TestRole)
          : role;

  const creds = TEST_CREDENTIALS[resolvedRole];

  if (!creds) {
    throw new Error(
      `Unknown role: ${role}. Available roles: ${Object.keys(TEST_CREDENTIALS).join(', ')}`
    );
  }

  console.log(`[Test] Logging in as ${resolvedRole} (${creds.username})`);

  const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:5173';
  const loginResponse = await page.context().request.post(baseUrl + '/api/v1/public/auth/login', {
    data: {
      username: creds.username,
      password: creds.password,
    },
  });

  if (!loginResponse.ok()) {
    const errorText = await loginResponse.text();
    throw new Error(`Login failed: ${loginResponse.status()} - ${errorText}`);
  }

  const cookies = loginResponse.headers()['set-cookie'];
  if (cookies) {
    const cookieStrings = Array.isArray(cookies) ? cookies : [cookies];
    for (const cookieStr of cookieStrings) {
      const [nameValuePart] = cookieStr.split(';');
      const [name, value] = nameValuePart.trim().split('=');

      const cookie: any = {
        name: name,
        value: value,
        url: baseUrl,
      };

      try {
        await page.context().addCookies([cookie]);
      } catch (error) {
        console.warn(`Failed to set cookie ${name}:`, error);
      }
    }
  }

  const authData = await loginResponse.json();
  const token = authData.token || authData.access_token;

  if (!token) {
    throw new Error(`Login response missing token: ${JSON.stringify(authData)}`);
  }

  await page.addInitScript(() => {
    window.sessionStorage.setItem('auth_validation_state', 'valid');
    window.localStorage.setItem('language', 'en');
  });

  setTestLanguage('en');
  await page.goto('/admin/dashboard');
  await page.waitForLoadState('domcontentloaded');

  try {
    await page.waitForSelector('text=Dashboard', { timeout: 15000 });
  } catch {
    await page.waitForURL('**/dashboard', { timeout: 5000 }).catch(() => {});
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
 * Get a data-testid locator for a specific element
 * Uses correct test IDs from the app
 */
export function getByTestId(page: Page, testId: string) {
  return page.getByTestId(testId);
}

/**
 * Get a data-testid locator for navigation elements
 */
export function getNavTestId(page: Page, navItem: string) {
  return page.getByTestId(`admin_nav_${navItem}_en`);
}

/**
 * Get a data-testid locator for button elements
 */
export function getButtonTestId(page: Page, prefix: string, buttonName: string) {
  return page.getByTestId(`${prefix}_btn_${buttonName}_en`);
}

/**
 * Get a data-testid locator for input elements
 */
export function getInputTestId(page: Page, prefix: string, inputName: string) {
  return page.getByTestId(`${prefix}_input_${inputName}_en`);
}

/**
 * Get a data-testid locator for view/container elements
 */
export function getViewTestId(page: Page, viewName: string) {
  return page.getByTestId(`${viewName}_view_en`);
}

/**
 * Wait for loading spinner to disappear
 * Gracefully handles cases where spinner never appears (fast responses)
 * 
 * Usage:
 *   await login(page, 'admin', 'admin');
 *   await waitForSpinner(page);
 * 
 * @param page - Playwright page instance
 * @param timeout - Maximum wait time in milliseconds (default: 15000)
 */
export async function waitForSpinner(page: Page, timeout: number = 15000): Promise<void> {
  // Wait for spinner to appear first (with short timeout)
  await page.waitForSelector('[data-testid="loading-spinner"]', { 
    state: 'attached',
    timeout: 2000 
  }).catch(() => {
    // Spinner never appeared - this is OK for fast API responses
    console.log('[E2E] No spinner detected (fast response)');
  });
  
  // Then wait for it to disappear
  await page.waitForSelector('[data-testid="loading-spinner"]', { 
    state: 'hidden', 
    timeout 
  }).catch(() => {
    // Spinner was never visible or already gone - this is OK
    console.log('[E2E] Spinner already hidden or never shown');
  });
}
