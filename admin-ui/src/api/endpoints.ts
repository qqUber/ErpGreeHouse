/**
 * API Endpoints Module
 * All API endpoint definitions organized by domain
 */

import { api, fetchWithAuth } from './client';
import type {
  AdminMe,
  CategoryDistribution,
  ChartData,
  ConsentRecord,
  CreateSaleRequest,
  CreateSaleResponse,
  CustomerDetails,
  CustomerListItem,
  CustomerSegmentation,
  DashboardOverview,
  DashboardPreferences,
  DevCreateSaleResult,
  FeatureFlags,
  ImportPreview,
  ImportResult,
  Integration,
  IntegrationDelivery,
  IntegrationTemplate,
  LoyaltyDetailedReport,
  LoyaltyReportOverview,
  MarketingCampaign,
  MarketingCampaignPreview,
  MarketingSegment,
  MarketingTrigger,
  PaginationInfo,
  Product,
  RecalculateAnalytics,
  RolePermissions,
  SalesByDay,
  SalesStats,
  ThemeConfig,
  TopProduct,
  TransactionItem,
  UserPreferences,
} from './types';

// Auth API
export const authApi = {
  status: (signal?: AbortSignal) =>
    api<{
      api: string;
      admin_auth_configured: boolean;
      debug_mode: boolean;
      erp_sync_enabled: boolean;
    }>('/api/v1/public/status', { method: 'GET', headers: {}, signal }),

  me: (signal?: AbortSignal) =>
    api<AdminMe>('/api/v1/auth/me', { method: 'GET', headers: {}, signal }),

  authStatus: (signal?: AbortSignal) =>
    api<{
      bootstrap_enabled: boolean;
      default_admin_present: boolean;
      default_admin_username: string;
      must_change_password: boolean;
    }>('/api/v1/public/auth/status', {
      method: 'GET',
      headers: {},
      signal,
    }),

  login: (username: string, password: string, signal?: AbortSignal) =>
    api<{
      token: string;
      must_change_password: boolean;
      access_token?: string;
      refresh_token?: string;
    }>('/api/v1/public/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      signal,
    }),

  refreshToken: (signal?: AbortSignal) =>
    api<{ refreshed: boolean; token_type?: string }>('/api/v1/public/auth/refresh', {
      method: 'POST',
      signal,
    }),

  changePassword: (old_password: string, new_password: string, signal?: AbortSignal) =>
    api<{ changed: boolean }>('/api/v1/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ old_password, new_password }),
      signal,
    }),

  logout: (signal?: AbortSignal) =>
    api<{ logged_out: boolean }>('/api/v1/auth/logout', { method: 'POST', headers: {}, signal }),

  recoverPassword: (
    username: string,
    new_password: string,
    recoverySecret: string,
    signal?: AbortSignal
  ) =>
    api<{ recovered: boolean }>('/api/v1/public/auth/recover', {
      method: 'POST',
      body: JSON.stringify({ username, new_password }),
      headers: { 'x-admin-recovery': recoverySecret } as any,
      signal,
    }),
};

// Customers API
export const customersApi = {
  list: (q?: string, page?: number, limit?: number, signal?: AbortSignal) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (page) params.set('page', String(page));
    if (limit) params.set('limit', String(limit));
    const query = params.toString();
    return api<{ items: CustomerListItem[]; pagination: PaginationInfo }>(
      `/api/v1/customers${query ? `?${query}` : ''}`,
      { signal }
    );
  },

  get: (id: number) => api<CustomerDetails>(`/api/v1/customers/${id}`),

  create: (payload: { full_name: string; phone?: string; notes?: string }) =>
    api<{ id: number; qr_token: string }>('/api/v1/customers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  identifyByPhone: (phone: string) =>
    api<{ customer_id: number }>('/api/v1/identify/phone', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  identifyByQr: (qr: string) =>
    api<{ customer_id: number }>('/api/v1/identify/qr', {
      method: 'POST',
      body: JSON.stringify({ qr }),
    }),

  identifyByName: (name: string) =>
    api<{ items: CustomerListItem[] }>('/api/v1/identify/name', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  getTransactions: (id: number) =>
    api<{ items: TransactionItem[] }>(`/api/v1/customers/${id}/transactions`),
};

// Sales API
export const salesApi = {
  create: (payload: CreateSaleRequest) =>
    api<CreateSaleResponse>('/api/v1/pos/sale', { method: 'POST', body: JSON.stringify(payload) }),

  devCreate: (payload: CreateSaleRequest) =>
    api<DevCreateSaleResult>('/api/v1/dev/sale', { method: 'POST', body: JSON.stringify(payload) }),

  getReceiptUrl: (txId: number) => {
    const base = typeof window !== 'undefined' ? '' : '';
    return `${base}/api/v1/transactions/${txId}/receipt`;
  },
};

// Integrations API
export const integrationsApi = {
  list: () => api<Integration[]>('/api/v1/integrations', { method: 'GET', headers: {} }),

  templates: () =>
    api<{ items: IntegrationTemplate[] }>('/api/v1/integrations/templates', {
      method: 'GET',
      headers: {},
    }),

  create: (payload: { name: string; kind: string; enabled: boolean; config: any }) =>
    api<{ id: number }>('/api/v1/integrations', { method: 'POST', body: JSON.stringify(payload) }),

  update: (id: number, payload: { name: string; kind: string; enabled: boolean; config: any }) =>
    api<{ updated: boolean }>(`/api/v1/integrations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  delete: (id: number) =>
    api<{ deleted: boolean }>(`/api/v1/integrations/${id}`, { method: 'DELETE' }),

  rotateSecret: (id: number) =>
    api<{ secret: string }>(`/api/v1/integrations/${id}/rotate-secret`, { method: 'POST' }),

  getDeliveries: (id: number) =>
    api<{ items: IntegrationDelivery[] }>(`/api/v1/integrations/${id}/deliveries`, {
      method: 'GET',
      headers: {},
    }),
};

// Products API
export const productsApi = {
  list: (q?: string, page?: number, limit?: number) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (page) params.set('page', String(page));
    if (limit) params.set('limit', String(limit));
    const query = params.toString();
    return api<{ items: Product[]; pagination: PaginationInfo }>(
      `/api/v1/products${query ? `?${query}` : ''}`,
      {
        method: 'GET',
        headers: {},
      }
    );
  },

  create: (payload: { code: string; name: string; kind: string; price: number; active: boolean }) =>
    api<{ id: number }>('/api/v1/products', { method: 'POST', body: JSON.stringify(payload) }),

  importFromFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api<ImportResult>('/api/v1/products/import/file', {
      method: 'POST',
      body: formData,
    });
  },

  importFromUrl: (url: string, format: 'json' | 'xml' = 'json') =>
    api<ImportResult>('/api/v1/products/import/url', {
      method: 'POST',
      body: JSON.stringify({ url, format }),
    }),

  previewImport: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api<ImportPreview>('/api/v1/products/import/preview', {
      method: 'POST',
      body: formData,
    });
  },
};

// Permissions API
export const permissionsApi = {
  list: () =>
    api<{ items: RolePermissions[]; all_permissions: string[] }>('/api/v1/roles/permissions'),

  update: (role: string, permission: string, is_allowed: boolean) =>
    api<{ success: boolean }>('/api/v1/roles/permissions', {
      method: 'POST',
      body: JSON.stringify({ role, permission, is_allowed }),
    }),
};

// Marketing API
export const marketingApi = {
  segments: {
    list: () => api<{ items: MarketingSegment[] }>('/api/v1/marketing/segments'),
    create: (payload: { name: string; criteria: Record<string, unknown> }) =>
      api<{ id: number }>('/api/v1/marketing/segments', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    refresh: (id: number) =>
      api<{ status: string; message: string }>(`/api/v1/marketing/segments/${id}/refresh`, {
        method: 'POST',
      }),
  },

  campaigns: {
    list: () => api<{ items: MarketingCampaign[] }>('/api/v1/marketing/campaigns'),
    create: (payload: {
      name: string;
      segment_id: number | null;
      type: string;
      content: string;
      content_type?: string;
      media_urls?: string;
      caption?: string;
      scheduled_at?: string;
      budget_limit?: number | null;
    }) =>
      api<{ id: number; status: string; campaign: MarketingCampaign }>(
        '/api/v1/marketing/campaigns',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      ),
    preview: (payload: {
      name: string;
      segment_id: number | null;
      type: string;
      content: string;
      content_type?: string;
      media_urls?: string;
      caption?: string;
      scheduled_at?: string;
      budget_limit?: number | null;
    }) =>
      api<MarketingCampaignPreview>('/api/v1/marketing/campaigns/preview', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    send: (id: number) =>
      api<{ status: string; recipients: number; note: string; campaign: MarketingCampaign }>(
        `/api/v1/marketing/campaigns/${id}/send`,
        { method: 'POST' }
      ),
    pause: (id: number) =>
      api<{ campaign: MarketingCampaign }>(`/api/v1/marketing/campaigns/${id}/pause`, {
        method: 'PUT',
      }),
    resume: (id: number) =>
      api<{ campaign: MarketingCampaign }>(`/api/v1/marketing/campaigns/${id}/resume`, {
        method: 'PUT',
      }),
    cancel: (id: number) =>
      api<{ campaign: MarketingCampaign }>(`/api/v1/marketing/campaigns/${id}/cancel`, {
        method: 'PUT',
      }),
    updateBudget: (id: number, budget_limit: number | null) =>
      api<{ campaign: MarketingCampaign }>(`/api/v1/marketing/campaigns/${id}/budget`, {
        method: 'PUT',
        body: JSON.stringify({ budget_limit }),
      }),
  },

  triggers: {
    list: () => api<{ items: MarketingTrigger[] }>('/api/v1/marketing/triggers'),
    create: (payload: {
      name: string;
      event_source: string;
      criteria: Record<string, any>;
      delay_hours: number;
      message_text: string;
      media_type?: string;
      media_url?: string;
      caption?: string;
    }) =>
      api<{ id: number }>('/api/v1/marketing/triggers', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },
};

// Analytics API
export const analyticsApi = {
  salesByDay: (days: number = 30) => api<SalesByDay>(`/api/v1/analytics/sales-by-day?days=${days}`),

  topProducts: (days: number = 30, limit: number = 10) =>
    api<TopProduct>(`/api/v1/analytics/top-products?days=${days}&limit=${limit}`),

  categoryDistribution: (days: number = 30) =>
    api<CategoryDistribution>(`/api/v1/analytics/category-distribution?days=${days}`),

  recalculate: () => api<RecalculateAnalytics>('/api/v1/analytics/recalculate', { method: 'POST' }),

  dashboard: {
    overview: (timeRange: string = '7d') =>
      api<DashboardOverview>(`/api/v1/analytics/dashboard/overview?time_range=${timeRange}`),
    sales: (timeRange: string = '7d', interval: string = 'day') =>
      api<ChartData>(
        `/api/v1/analytics/dashboard/sales?time_range=${timeRange}&interval=${interval}`
      ),
    customers: (timeRange: string = '7d', interval: string = 'day') =>
      api<ChartData>(
        `/api/v1/analytics/dashboard/customers?time_range=${timeRange}&interval=${interval}`
      ),
    loyalty: (timeRange: string = '7d', interval: string = 'day') =>
      api<ChartData>(
        `/api/v1/analytics/dashboard/loyalty?time_range=${timeRange}&interval=${interval}`
      ),
  },

  customerSegmentation: () => api<CustomerSegmentation>('/api/v1/analytics/customers/segmentation'),

  reports: {
    loyaltyOverview: (timeRange: string = '30d') =>
      api<LoyaltyReportOverview>(
        `/api/v1/analytics/reports/loyalty/overview?time_range=${timeRange}`
      ),
    loyaltyDetailed: (timeRange: string = '30d') =>
      api<LoyaltyDetailedReport>(
        `/api/v1/analytics/reports/loyalty/detailed?time_range=${timeRange}`
      ),
  },

  export: {
    loyalty: (timeRange: string = '30d') =>
      fetchWithAuth(`/api/v1/analytics/export/loyalty/csv?time_range=${timeRange}`, {
        method: 'GET',
      }),
    sales: (timeRange: string = '30d') =>
      fetchWithAuth(`/api/v1/analytics/export/sales/csv?time_range=${timeRange}`, {
        method: 'GET',
      }),
  },

  stats: (days: number) => api<SalesStats>(`/api/v1/stats/sales?days=${days}`),
};

// Config/Preferences API
export const configApi = {
  getTheme: () => api<ThemeConfig>('/api/v1/config/theme'),

  getPreferences: () => api<UserPreferences>('/api/v1/config/preferences'),
  updatePreferences: (prefs: Partial<UserPreferences>) =>
    api('/api/v1/config/preferences', { method: 'PUT', body: JSON.stringify(prefs) }),

  getDashboardPreferences: () => api<DashboardPreferences>('/api/v1/config/preferences/dashboard'),
  updateDashboardPreferences: (prefs: Partial<DashboardPreferences>) =>
    api('/api/v1/config/preferences/dashboard', { method: 'PUT', body: JSON.stringify(prefs) }),

  getFeatures: () => api<FeatureFlags>('/api/v1/config/features'),
};

// Enterprise Dashboard API
export const dashboardApi = {
  operational: () =>
    api<import('../hooks/useDashboard').OperationalData>('/api/v1/dashboard/operational'),
  marketing: () =>
    api<import('../hooks/useDashboard').MarketingData>('/api/v1/dashboard/marketing'),
  customers: () => api<import('../hooks/useDashboard').CustomerData>('/api/v1/dashboard/customers'),
  products: () => api<import('../hooks/useDashboard').ProductData>('/api/v1/dashboard/products'),
  integrations: () =>
    api<import('../hooks/useDashboard').IntegrationData>('/api/v1/dashboard/integrations'),
  home: () =>
    api<import('../services/dashboard-analytics.service').DashboardHomeViewModel>(
      '/api/v1/dashboard/home'
    ),
  marketingAnalytics: () =>
    api<import('../components/dashboard/AnalyticsWidget').MarketingAnalyticsData>(
      '/api/v1/analytics/dashboard/marketing'
    ),
};

// Compliance API
export const complianceApi = {
  getConsents: (customerId?: number) => {
    const query = customerId ? `?customer_id=${customerId}` : '';
    return api<{ items: ConsentRecord[] }>(`/api/v1/compliance/consents${query}`);
  },
};

// Legacy compatibility exports
export const Api = {
  // Auth
  publicStatus: authApi.status,
  me: authApi.me,
  authStatus: authApi.authStatus,
  login: authApi.login,
  refreshToken: authApi.refreshToken,
  changePassword: authApi.changePassword,
  logout: authApi.logout,
  recoverPassword: authApi.recoverPassword,

  // Customers
  customers: customersApi.list,
  customer: customersApi.get,
  createCustomer: customersApi.create,
  identifyPhone: customersApi.identifyByPhone,
  identifyQr: customersApi.identifyByQr,
  identifyName: customersApi.identifyByName,

  // Sales
  createSale: salesApi.create,
  devCreateSale: salesApi.devCreate,
  receiptUrl: (txId: number) => {
    const base = typeof window !== 'undefined' ? '' : '';
    return `${base}/api/v1/transactions/${txId}/receipt`;
  },

  // Integrations
  integrations: integrationsApi.list,
  integrationTemplates: integrationsApi.templates,
  createIntegration: integrationsApi.create,
  updateIntegration: integrationsApi.update,
  deleteIntegration: integrationsApi.delete,
  rotateIntegrationSecret: integrationsApi.rotateSecret,
  integrationDeliveries: integrationsApi.getDeliveries,

  // Products
  products: productsApi.list,
  createProduct: productsApi.create,
  importProducts: productsApi.importFromFile,
  importProductsUrl: productsApi.importFromUrl,
  previewProductsImport: productsApi.previewImport,

  // Permissions
  permissions: permissionsApi.list,
  updatePermission: permissionsApi.update,

  // Marketing
  marketingSegments: marketingApi.segments.list,
  createMarketingSegment: marketingApi.segments.create,
  refreshMarketingSegment: marketingApi.segments.refresh,
  marketingCampaigns: marketingApi.campaigns.list,
  createMarketingCampaign: marketingApi.campaigns.create,
  previewMarketingCampaign: marketingApi.campaigns.preview,
  sendMarketingCampaign: marketingApi.campaigns.send,
  pauseMarketingCampaign: marketingApi.campaigns.pause,
  resumeMarketingCampaign: marketingApi.campaigns.resume,
  cancelMarketingCampaign: marketingApi.campaigns.cancel,
  updateMarketingCampaignBudget: marketingApi.campaigns.updateBudget,
  marketingTriggers: marketingApi.triggers.list,
  createMarketingTrigger: marketingApi.triggers.create,

  // Analytics
  salesStats: analyticsApi.stats,
  salesByDay: analyticsApi.salesByDay,
  topProducts: analyticsApi.topProducts,
  categoryDistribution: analyticsApi.categoryDistribution,
  recalculateAnalytics: analyticsApi.recalculate,
  dashboardOverview: analyticsApi.dashboard.overview,
  salesChart: analyticsApi.dashboard.sales,
  customerChart: analyticsApi.dashboard.customers,
  loyaltyChart: analyticsApi.dashboard.loyalty,
  loyaltyReportOverview: analyticsApi.reports.loyaltyOverview,
  loyaltyDetailedReport: analyticsApi.reports.loyaltyDetailed,
  customerSegmentation: analyticsApi.customerSegmentation,
  exportLoyaltyReport: analyticsApi.export.loyalty,
  exportSalesReport: analyticsApi.export.sales,

  // Dashboard
  dashboardOperational: dashboardApi.operational,
  dashboardMarketing: dashboardApi.marketing,
  dashboardCustomers: dashboardApi.customers,
  dashboardProducts: dashboardApi.products,
  dashboardIntegrations: dashboardApi.integrations,
  dashboardHome: dashboardApi.home,
  marketingAnalytics: dashboardApi.marketingAnalytics,
};
