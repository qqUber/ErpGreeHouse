import { test as base, Page, TestInfo } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Import i18n utilities
import { setTestLanguage, Menu, Common, Dashboard, Sales, Clients, Products, Marketing, Auth, t } from './i18n-test';

export { t, Menu, Common, Dashboard, Sales, Clients, Products, Marketing, Auth };

export const test = base;
export { expect } from '@playwright/test';

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

  // Get tokens directly from API (bypassing UI for reliable authentication)
  const loginResponse = await page.request.post('/api/v1/public/auth/login', {
    data: {
      username: creds.username,
      password: creds.password,
    },
  });

  if (!loginResponse.ok()) {
    const errorText = await loginResponse.text();
    throw new Error(`Login failed: ${loginResponse.status()} - ${errorText}`);
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

  // Navigate directly to dashboard - the auth context will validate the token
  // and the user will be authenticated. We bypass the login page navigation issue.
  await page.goto('/dashboard');

  // Wait for app to fully load
  await page.waitForLoadState('domcontentloaded');

  // Wait for dashboard content to be visible (either the nav items or the page to load)
  try {
    await page.waitForSelector('text=Dashboard', { timeout: 15000 });
  } catch {
    // If nav items not found, try waiting for URL or other dashboard elements
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
 * Get a data-testid selector for a specific element.
 * Pattern: {prefix}_{element}_{lang}, e.g., 'admin_nav_dashboard_en'
 *
 * @param prefix - Component prefix (e.g., 'admin', 'operator', 'manager', 'common')
 * @param element - Element identifier (e.g., 'nav_dashboard', 'btn_new_sale')
 * @param lang - Language code (defaults to 'en')
 * @returns The full data-testid string
 */
export function getTestId(prefix: string, element: string, lang: string = 'en'): string {
  return `${prefix}_${element}_${lang}`;
}

/**
 * Locator for a data-testid element using Playwright's getByTestId
 * This is language-independent and more stable than getByText
 *
 * @param page - Playwright page object
 * @param testId - The data-testid value
 * @returns Playwright locator
 */
export function getByTestId(page: Page, testId: string) {
  return page.getByTestId(testId);
}

/**
 * Get a data-testid locator for navigation elements
 * Common patterns: admin_nav_dashboard_en, admin_nav_clients_en, etc.
 */
export function getNavTestId(page: Page, navItem: string, lang: string = 'en') {
  return page.getByTestId(`admin_nav_${navItem}_${lang}`);
}

/**
 * Get a data-testid locator for button elements
 * Common patterns: admin_btn_save_en, operator_btn_new_sale_en, etc.
 */
export function getButtonTestId(page: Page, prefix: string, buttonName: string, lang: string = 'en') {
  return page.getByTestId(`${prefix}_btn_${buttonName}_${lang}`);
}

/**
 * Get a data-testid locator for input elements
 * Common patterns: common_input_username_en, admin_input_customer_search_en
 */
export function getInputTestId(page: Page, prefix: string, inputName: string, lang: string = 'en') {
  return page.getByTestId(`${prefix}_input_${inputName}_${lang}`);
}

/**
 * Get a data-testid locator for view/container elements
 * Common patterns: customers_view_en, products_view_en, pos_view_en
 */
export function getViewTestId(page: Page, viewName: string, lang: string = 'en') {
  return page.getByTestId(`${viewName}_view_${lang}`);
}

/**
 * Pre-defined test ID patterns for common elements
 * These match the data-testid attributes in the React components
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
    btnLogin: 'common_btn_login_en',
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
