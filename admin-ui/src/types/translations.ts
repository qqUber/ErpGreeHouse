/**
 * TypeScript interfaces for translation keys.
 * Provides type-safe access to i18next translation keys.
 */

// Root translation namespace keys
export type TranslationNamespace =
  | 'app'
  | 'roles'
  | 'menu'
  | 'auth'
  | 'common'
  | 'dashboard'
  | 'sales'
  | 'clients'
  | 'products'
  | 'marketing'
  | 'integrations'
  | 'settings'
  | 'notifications'
  | 'errors'
  | 'forms'
  | 'table'
  | 'date';

// App namespace
export interface AppTranslations {
  title: string;
}

// Roles namespace
export interface RolesTranslations {
  administrator: string;
  manager: string;
  observer: string;
}

// Menu namespace
export interface MenuTranslations {
  dashboard: string;
  sales: string;
  clients: string;
  products: string;
  marketing: string;
  integrations: string;
  settings: string;
}

// Auth namespace
export interface AuthTranslations {
  login: string;
  logout: string;
  username: string;
  password: string;
  loginButton: string;
  loggingIn: string;
  loginError: string;
  invalidCredentials: string;
  sessionExpired: string;
}

// Common namespace
export interface CommonTranslations {
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  add: string;
  search: string;
  filter: string;
  export: string;
  import: string;
  refresh: string;
  close: string;
  confirm: string;
  back: string;
  next: string;
  previous: string;
  yes: string;
  no: string;
  loading: string;
  noData: string;
}

// Dashboard namespace
export interface DashboardTranslations {
  title: string;
  totalSales: string;
  totalClients: string;
  totalOrders: string;
  averageCheck: string;
  recentSales: string;
  topProducts: string;
}

// Sales namespace
export interface SalesTranslations {
  title: string;
  newSale: string;
  orders: string;
  receipts: string;
  todaySales: string;
  monthlySales: string;
  orderNumber: string;
  orderDate: string;
  orderStatus: string;
  orderTotal: string;
}

// Clients namespace
export interface ClientsTranslations {
  title: string;
  addClient: string;
  editClient: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;
  clientBonus: string;
  clientTier: string;
  totalSpent: string;
  visitCount: string;
  lastVisit: string;
}

// Products namespace
export interface ProductsTranslations {
  title: string;
  addProduct: string;
  editProduct: string;
  productName: string;
  productPrice: string;
  productCategory: string;
  productStock: string;
  productDescription: string;
  importProducts: string;
  exportProducts: string;
}

// Marketing namespace
export interface MarketingTranslations {
  title: string;
  campaigns: string;
  promotions: string;
  loyalty: string;
  createCampaign: string;
  campaignName: string;
  campaignType: string;
  campaignStatus: string;
  startDate: string;
  endDate: string;
  targetAudience: string;
  discount: string;
  bonusPoints: string;
}

// Integrations namespace
export interface IntegrationsTranslations {
  title: string;
  telegram: string;
  vk: string;
  pos: string;
  webhooks: string;
  settings: string;
  enable: string;
  disable: string;
  configure: string;
  apiKey: string;
  webhookUrl: string;
  botToken: string;
  chatId: string;
}

// Settings namespace
export interface SettingsTranslations {
  title: string;
  general: string;
  users: string;
  roles: string;
  notifications: string;
  language: string;
  currency: string;
  timezone: string;
  companyName: string;
  companyAddress: string;
}

// Notifications namespace
export interface NotificationsTranslations {
  success: string;
  error: string;
  warning: string;
  info: string;
  saved: string;
  deleted: string;
  updated: string;
  created: string;
  sent: string;
}

// Errors namespace
export interface ErrorsTranslations {
  required: string;
  invalidEmail: string;
  invalidPhone: string;
  minLength: string;
  maxLength: string;
  networkError: string;
  serverError: string;
  notFound: string;
  unauthorized: string;
  forbidden: string;
  validationError: string;
}

// Forms placeholder namespace
export interface FormsPlaceholderTranslations {
  search: string;
  username: string;
  password: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

// Forms labels namespace
export interface FormsLabelsTranslations {
  rememberMe: string;
  showPassword: string;
  hidePassword: string;
}

// Forms namespace (combines placeholder and labels)
export interface FormsTranslations {
  placeholder: FormsPlaceholderTranslations;
  labels: FormsLabelsTranslations;
}

// Table namespace
export interface TableTranslations {
  actions: string;
  noResults: string;
  showing: string;
  rowsPerPage: string;
}

// Date namespace
export interface DateTranslations {
  today: string;
  yesterday: string;
  thisWeek: string;
  thisMonth: string;
  lastMonth: string;
}

// Complete translation structure
export interface Translations {
  app: AppTranslations;
  roles: RolesTranslations;
  menu: MenuTranslations;
  auth: AuthTranslations;
  common: CommonTranslations;
  dashboard: DashboardTranslations;
  sales: SalesTranslations;
  clients: ClientsTranslations;
  products: ProductsTranslations;
  marketing: MarketingTranslations;
  integrations: IntegrationsTranslations;
  settings: SettingsTranslations;
  notifications: NotificationsTranslations;
  errors: ErrorsTranslations;
  forms: FormsTranslations;
  table: TableTranslations;
  date: DateTranslations;
}
