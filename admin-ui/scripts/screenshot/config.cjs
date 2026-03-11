/**
 * Screenshot Configuration
 * Defines all pages to capture with their selectors and validation rules
 */

const BASE_URL = process.env.SCREENSHOT_BASE_URL || 'http://localhost:5173';

const pages = [
  {
    name: '01-login',
    url: '/admin/',
    description: 'Login page',
    requiresLogin: false,
    waitForSelector: '[data-testid="common_input_username_en"]',
  },
  {
    name: '02-login-filled',
    url: '/admin/',
    description: 'Login form with credentials',
    requiresLogin: false,
    waitForSelector: '[data-testid="common_input_username_en"]',
    action: async (page) => {
      await page.fill('[data-testid="common_input_username_en"]', 'admin');
      await page.fill('[data-testid="common_input_password_en"]', 'admin');
    },
  },
  {
    name: '03-login-error',
    url: '/admin/',
    description: 'Login with error state',
    requiresLogin: false,
    waitForSelector: '[data-testid="common_input_username_en"]',
    action: async (page) => {
      // Fill username with wrong password to trigger error
      await page.fill('[data-testid="common_input_username_en"]', 'admin');
      await page.fill('[data-testid="common_input_password_en"]', 'wrongpassword');
      await page.click('[data-testid="common_btn_login_en"]');
      await page.waitForTimeout(500);
    },
  },
  {
    name: '04-dashboard',
    navSelector: '[data-testid="admin_nav_dashboard_en"]',
    description: 'Dashboard with widgets',
    requiresLogin: true,
    waitForSelector: '.widget-container',
  },
  {
    name: '05-customers',
    navSelector: '[data-testid="admin_nav_customers_en"]',
    description: 'Customers list',
    requiresLogin: true,
    waitForSelector: '.customers-list, [data-testid*="customer"]',
  },
  {
    name: '06-pos',
    navSelector: '[data-testid="admin_nav_pos_en"]',
    description: 'POS/Sales form',
    requiresLogin: true,
    waitForSelector: '.pos-container, [data-testid*="pos"]',
  },
  {
    name: '07-products',
    navSelector: '[data-testid="admin_nav_products_en"]',
    description: 'Products catalog',
    requiresLogin: true,
    waitForSelector: '.products-list, .product-item',
  },
  {
    name: '08-marketing',
    navSelector: '[data-testid="admin_nav_marketing_en"]',
    description: 'Marketing campaigns',
    requiresLogin: true,
    waitForSelector: '.marketing-container, [data-testid*="marketing"]',
  },
  {
    name: '09-settings',
    navSelector: '[data-testid="admin_nav_settings_en"]',
    description: 'Settings page',
    requiresLogin: true,
    waitForSelector: '.settings-container, [data-testid*="settings"]',
  },
  {
    name: '10-integrations',
    navSelector: '[data-testid="admin_nav_integrations_en"]',
    description: 'Integrations page',
    requiresLogin: true,
    waitForSelector: '.integrations-list, [data-testid*="integration"]',
  },
  {
    name: '11-widget-expanded',
    description: 'Dashboard with expanded widget',
    requiresLogin: true,
    action: async (page) => {
      await page.click('[data-testid="admin_nav_dashboard_en"]');
      await page.waitForSelector('.widget-container', { timeout: 5000 });
      const widget = await page.locator('.widget-container').first();
      await widget.click();
      await page.waitForTimeout(500);
    },
  },
];

module.exports = {
  BASE_URL,
  pages,
  SCREENSHOT_DIR: require('path').join(__dirname, '..', '..', 'exploration', 'screenshots'),
  BASELINE_DIR: require('path').join(__dirname, '..', '..', 'exploration', 'baselines'),
  VIEWPORT: {
    width: 1920,
    height: 1080,
  },
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  // Validation settings
  MIN_UNIQUE_COLORS: 1000, // Minimum colors to consider screenshot valid
  // Visual diff settings
  DIFF_THRESHOLD: 0.001, // 0.1% pixel difference
  // Parallel execution
  MAX_PARALLEL: 4,
  // Timeouts
  NAVIGATION_TIMEOUT: 15000,
  SELECTOR_TIMEOUT: 10000,
};
