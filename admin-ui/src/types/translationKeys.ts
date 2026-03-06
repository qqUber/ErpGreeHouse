/**
 * Translation key constants for type-safe i18next usage.
 * These constants match the structure of locale JSON files.
 */

// App namespace keys
export const AppKeys = {
  TITLE: 'app.title',
} as const;

// Roles namespace keys
export const RolesKeys = {
  ADMINISTRATOR: 'roles.administrator',
  MANAGER: 'roles.manager',
  OBSERVER: 'roles.observer',
} as const;

// Menu namespace keys
export const MenuKeys = {
  DASHBOARD: 'menu.dashboard',
  SALES: 'menu.sales',
  CLIENTS: 'menu.clients',
  PRODUCTS: 'menu.products',
  MARKETING: 'menu.marketing',
  INTEGRATIONS: 'menu.integrations',
  SETTINGS: 'menu.settings',
} as const;

// Auth namespace keys
export const AuthKeys = {
  LOGIN: 'auth.login',
  LOGOUT: 'auth.logout',
  USERNAME: 'auth.username',
  PASSWORD: 'auth.password',
  LOGIN_BUTTON: 'auth.loginButton',
  LOGGING_IN: 'auth.loggingIn',
  LOGIN_ERROR: 'auth.loginError',
  INVALID_CREDENTIALS: 'auth.invalidCredentials',
  SESSION_EXPIRED: 'auth.sessionExpired',
} as const;

// Common namespace keys
export const CommonKeys = {
  SAVE: 'common.save',
  CANCEL: 'common.cancel',
  DELETE: 'common.delete',
  EDIT: 'common.edit',
  ADD: 'common.add',
  SEARCH: 'common.search',
  FILTER: 'common.filter',
  EXPORT: 'common.export',
  IMPORT: 'common.import',
  REFRESH: 'common.refresh',
  CLOSE: 'common.close',
  CONFIRM: 'common.confirm',
  BACK: 'common.back',
  NEXT: 'common.next',
  PREVIOUS: 'common.previous',
  YES: 'common.yes',
  NO: 'common.no',
  LOADING: 'common.loading',
  NO_DATA: 'common.noData',
} as const;

// Dashboard namespace keys
export const DashboardKeys = {
  TITLE: 'dashboard.title',
  TOTAL_SALES: 'dashboard.totalSales',
  TOTAL_CLIENTS: 'dashboard.totalClients',
  TOTAL_ORDERS: 'dashboard.totalOrders',
  AVERAGE_CHECK: 'dashboard.averageCheck',
  RECENT_SALES: 'dashboard.recentSales',
  TOP_PRODUCTS: 'dashboard.topProducts',
} as const;

// Sales namespace keys
export const SalesKeys = {
  TITLE: 'sales.title',
  NEW_SALE: 'sales.newSale',
  ORDERS: 'sales.orders',
  RECEIPTS: 'sales.receipts',
  TODAY_SALES: 'sales.todaySales',
  MONTHLY_SALES: 'sales.monthlySales',
  ORDER_NUMBER: 'sales.orderNumber',
  ORDER_DATE: 'sales.orderDate',
  ORDER_STATUS: 'sales.orderStatus',
  ORDER_TOTAL: 'sales.orderTotal',
} as const;

// Clients namespace keys
export const ClientsKeys = {
  TITLE: 'clients.title',
  ADD_CLIENT: 'clients.addClient',
  EDIT_CLIENT: 'clients.editClient',
  CLIENT_NAME: 'clients.clientName',
  CLIENT_PHONE: 'clients.clientPhone',
  CLIENT_EMAIL: 'clients.clientEmail',
  CLIENT_ADDRESS: 'clients.clientAddress',
  CLIENT_BONUS: 'clients.clientBonus',
  CLIENT_TIER: 'clients.clientTier',
  TOTAL_SPENT: 'clients.totalSpent',
  VISIT_COUNT: 'clients.visitCount',
  LAST_VISIT: 'clients.lastVisit',
} as const;

// Products namespace keys
export const ProductsKeys = {
  TITLE: 'products.title',
  ADD_PRODUCT: 'products.addProduct',
  EDIT_PRODUCT: 'products.editProduct',
  PRODUCT_NAME: 'products.productName',
  PRODUCT_PRICE: 'products.productPrice',
  PRODUCT_CATEGORY: 'products.productCategory',
  PRODUCT_STOCK: 'products.productStock',
  PRODUCT_DESCRIPTION: 'products.productDescription',
  IMPORT_PRODUCTS: 'products.importProducts',
  EXPORT_PRODUCTS: 'products.exportProducts',
} as const;

// Marketing namespace keys
export const MarketingKeys = {
  TITLE: 'marketing.title',
  CAMPAIGNS: 'marketing.campaigns',
  PROMOTIONS: 'marketing.promotions',
  LOYALTY: 'marketing.loyalty',
  CREATE_CAMPAIGN: 'marketing.createCampaign',
  CAMPAIGN_NAME: 'marketing.campaignName',
  CAMPAIGN_TYPE: 'marketing.campaignType',
  CAMPAIGN_STATUS: 'marketing.campaignStatus',
  START_DATE: 'marketing.startDate',
  END_DATE: 'marketing.endDate',
  TARGET_AUDIENCE: 'marketing.targetAudience',
  DISCOUNT: 'marketing.discount',
  BONUS_POINTS: 'marketing.bonusPoints',
} as const;

// Integrations namespace keys
export const IntegrationsKeys = {
  TITLE: 'integrations.title',
  TELEGRAM: 'integrations.telegram',
  VK: 'integrations.vk',
  POS: 'integrations.pos',
  WEBHOOKS: 'integrations.webhooks',
  SETTINGS: 'integrations.settings',
  ENABLE: 'integrations.enable',
  DISABLE: 'integrations.disable',
  CONFIGURE: 'integrations.configure',
  API_KEY: 'integrations.apiKey',
  WEBHOOK_URL: 'integrations.webhookUrl',
  BOT_TOKEN: 'integrations.botToken',
  CHAT_ID: 'integrations.chatId',
} as const;

// Settings namespace keys
export const SettingsKeys = {
  TITLE: 'settings.title',
  GENERAL: 'settings.general',
  USERS: 'settings.users',
  ROLES: 'settings.roles',
  NOTIFICATIONS: 'settings.notifications',
  LANGUAGE: 'settings.language',
  CURRENCY: 'settings.currency',
  TIMEZONE: 'settings.timezone',
  COMPANY_NAME: 'settings.companyName',
  COMPANY_ADDRESS: 'settings.companyAddress',
} as const;

// Notifications namespace keys
export const NotificationsKeys = {
  SUCCESS: 'notifications.success',
  ERROR: 'notifications.error',
  WARNING: 'notifications.warning',
  INFO: 'notifications.info',
  SAVED: 'notifications.saved',
  DELETED: 'notifications.deleted',
  UPDATED: 'notifications.updated',
  CREATED: 'notifications.created',
  SENT: 'notifications.sent',
} as const;

// Errors namespace keys
export const ErrorsKeys = {
  REQUIRED: 'errors.required',
  INVALID_EMAIL: 'errors.invalidEmail',
  INVALID_PHONE: 'errors.invalidPhone',
  MIN_LENGTH: 'errors.minLength',
  MAX_LENGTH: 'errors.maxLength',
  NETWORK_ERROR: 'errors.networkError',
  SERVER_ERROR: 'errors.serverError',
  NOT_FOUND: 'errors.notFound',
  UNAUTHORIZED: 'errors.unauthorized',
  FORBIDDEN: 'errors.forbidden',
  VALIDATION_ERROR: 'errors.validationError',
} as const;

// Forms placeholder namespace keys
export const FormsPlaceholderKeys = {
  SEARCH: 'forms.placeholder.search',
  USERNAME: 'forms.placeholder.username',
  PASSWORD: 'forms.placeholder.password',
  NAME: 'forms.placeholder.name',
  EMAIL: 'forms.placeholder.email',
  PHONE: 'forms.placeholder.phone',
  ADDRESS: 'forms.placeholder.address',
} as const;

// Forms labels namespace keys
export const FormsLabelsKeys = {
  REMEMBER_ME: 'forms.labels.rememberMe',
  SHOW_PASSWORD: 'forms.labels.showPassword',
  HIDE_PASSWORD: 'forms.labels.hidePassword',
} as const;

// Forms namespace keys (combined)
export const FormsKeys = {
  ...FormsPlaceholderKeys,
  ...FormsLabelsKeys,
} as const;

// Table namespace keys
export const TableKeys = {
  ACTIONS: 'table.actions',
  NO_RESULTS: 'table.noResults',
  SHOWING: 'table.showing',
  ROWS_PER_PAGE: 'table.rowsPerPage',
} as const;

// Date namespace keys
export const DateKeys = {
  TODAY: 'date.today',
  YESTERDAY: 'date.yesterday',
  THIS_WEEK: 'date.thisWeek',
  THIS_MONTH: 'date.thisMonth',
  LAST_MONTH: 'date.lastMonth',
} as const;

// All translation keys combined
export const TranslationKeys = {
  ...AppKeys,
  ...RolesKeys,
  ...MenuKeys,
  ...AuthKeys,
  ...CommonKeys,
  ...DashboardKeys,
  ...SalesKeys,
  ...ClientsKeys,
  ...ProductsKeys,
  ...MarketingKeys,
  ...IntegrationsKeys,
  ...SettingsKeys,
  ...NotificationsKeys,
  ...ErrorsKeys,
  ...FormsKeys,
  ...TableKeys,
  ...DateKeys,
} as const;

// Type for any translation key
export type TranslationKey = typeof TranslationKeys[keyof typeof TranslationKeys];
