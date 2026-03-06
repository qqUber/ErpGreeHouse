/**
 * i18n Test Utilities
 * 
 * Provides language-aware selectors for E2E tests.
 * English keys are the source of truth - use these in tests.
 * The utility handles translation to other languages.
 * 
 * Usage:
 *   import { t, getMenuLabel, getButtonLabel } from './i18n-test';
 * 
 *   // Get translated label for menu item
 *   await page.getByText(t('menu.sales')).click();
 * 
 *   // Or use convenience functions
 *   await page.getByText(getMenuLabel('sales')).click();
 */

import en from '../src/locales/en.json' with { type: 'json' };
import ru from '../src/locales/ru.json' with { type: 'json' };
import srb from '../src/locales/srb.json' with { type: 'json' };

/**
 * Supported languages - English is the default/source of truth
 */
export type Language = 'en' | 'ru' | 'srb';

const locales: Record<Language, typeof en> = { en, ru, srb };

/**
 * Current test language - can be overridden
 * Default is English since it's our source of truth
 */
let currentLanguage: Language = 'en';

/**
 * Set the language for tests
 * Call this in test setup based on app's language setting
 */
export function setTestLanguage(lang: Language): void {
  currentLanguage = lang;
  console.log(`[i18n] Test language set to: ${lang}`);
}

/**
 * Get current test language
 */
export function getTestLanguage(): Language {
  return currentLanguage;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): string | undefined {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

/**
 * Get translated text by i18n key
 * 
 * @param key - Dot-notation key (e.g., 'menu.sales', 'common.search')
 * @param lang - Optional language override (defaults to current test language)
 * @returns Translated text
 */
export function t(key: string, lang?: Language): string {
  const targetLang = lang || currentLanguage;
  const value = getNestedValue(locales[targetLang], key);
  
  if (!value) {
    console.warn(`[i18n] Missing translation for key: ${key} in ${targetLang}`);
    // Fallback to English
    return getNestedValue(locales.en, key) || key;
  }
  
  return value;
}

/**
 * Get menu label
 */
export function getMenuLabel(key: keyof typeof en.menu): string {
  return t(`menu.${key}`);
}

/**
 * Get common button/label
 */
export function getCommonLabel(key: keyof typeof en.common): string {
  return t(`common.${key}`);
}

/**
 * Get dashboard label
 */
export function getDashboardLabel(key: keyof typeof en.dashboard): string {
  return t(`dashboard.${key}`);
}

/**
 * Get sales label
 */
export function getSalesLabel(key: keyof typeof en.sales): string {
  return t(`sales.${key}`);
}

/**
 * Get clients label
 */
export function getClientsLabel(key: keyof typeof en.clients): string {
  return t(`clients.${key}`);
}

/**
 * Get products label
 */
export function getProductsLabel(key: keyof typeof en.products): string {
  return t(`products.${key}`);
}

/**
 * Get marketing label
 */
export function getMarketingLabel(key: keyof typeof en.marketing): string {
  return t(`marketing.${key}`);
}

/**
 * Get auth label
 */
export function getAuthLabel(key: keyof typeof en.auth): string {
  return t(`auth.${key}`);
}

/**
 * Get all translations for a given key across languages
 * Useful for debugging or understanding what text to expect
 */
export function getAllTranslations(key: string): Record<Language, string> {
  return {
    en: t(key, 'en'),
    ru: t(key, 'ru'),
    srb: t(key, 'srb'),
  };
}

/**
 * Pre-defined UI element maps for common test scenarios
 * These are organized by feature, not by language
 */

// Menu items - use these instead of hardcoded strings
export const Menu = {
  dashboard: () => getMenuLabel('dashboard'),
  sales: () => getMenuLabel('sales'),
  clients: () => getMenuLabel('clients'),
  products: () => getMenuLabel('products'),
  marketing: () => getMenuLabel('marketing'),
  integrations: () => getMenuLabel('integrations'),
  settings: () => getMenuLabel('settings'),
} as const;

// Common actions
export const Common = {
  search: () => getCommonLabel('search'),
  refresh: () => getCommonLabel('refresh'),
  save: () => getCommonLabel('save'),
  cancel: () => getCommonLabel('cancel'),
  delete: () => getCommonLabel('delete'),
  edit: () => getCommonLabel('edit'),
  add: () => getCommonLabel('add'),
  export: () => getCommonLabel('export'),
  import: () => getCommonLabel('import'),
  confirm: () => getCommonLabel('confirm'),
  loading: () => getCommonLabel('loading'),
  noData: () => getCommonLabel('noData'),
} as const;

// Dashboard elements
export const Dashboard = {
  title: () => getDashboardLabel('title'),
  recentSales: () => getDashboardLabel('recentSales'),
  topProducts: () => getDashboardLabel('topProducts'),
  totalSales: () => getDashboardLabel('totalSales'),
  totalClients: () => getDashboardLabel('totalClients'),
  averageCheck: () => getDashboardLabel('averageCheck'),
} as const;

// Sales/POS elements
export const Sales = {
  title: () => getSalesLabel('title'),
  newSale: () => getSalesLabel('newSale'),
  orders: () => getSalesLabel('orders'),
  receipts: () => getSalesLabel('receipts'),
  todaySales: () => getSalesLabel('todaySales'),
  monthlySales: () => getSalesLabel('monthlySales'),
} as const;

// Client elements
export const Clients = {
  title: () => getClientsLabel('title'),
  addClient: () => getClientsLabel('addClient'),
  editClient: () => getClientsLabel('editClient'),
  clientName: () => getClientsLabel('clientName'),
  clientPhone: () => getClientsLabel('clientPhone'),
  clientEmail: () => getClientsLabel('clientEmail'),
  clientBonus: () => getClientsLabel('clientBonus'),
} as const;

// Product elements
export const Products = {
  title: () => getProductsLabel('title'),
  addProduct: () => getProductsLabel('addProduct'),
  editProduct: () => getProductsLabel('editProduct'),
  productName: () => getProductsLabel('productName'),
  productPrice: () => getProductsLabel('productPrice'),
  productCategory: () => getProductsLabel('productCategory'),
  productStock: () => getProductsLabel('productStock'),
} as const;

// Marketing elements
export const Marketing = {
  title: () => getMarketingLabel('title'),
  campaigns: () => getMarketingLabel('campaigns'),
  promotions: () => getMarketingLabel('promotions'),
  loyalty: () => getMarketingLabel('loyalty'),
} as const;

// Auth elements
export const Auth = {
  login: () => getAuthLabel('login'),
  logout: () => getAuthLabel('logout'),
  username: () => getAuthLabel('username'),
  password: () => getAuthLabel('password'),
  loginButton: () => getAuthLabel('loginButton'),
  invalidCredentials: () => getAuthLabel('invalidCredentials'),
} as const;
