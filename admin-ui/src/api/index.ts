/**
 * API Module Barrel Export
 *
 * This is the main entry point for the API module.
 * All imports should come from this file for consistency.
 *
 * @example
 * import { api, Api, customersApi, authApi } from './api';
 * import type { Customer, Product } from './api/types';
 */

// Core client exports
export {
  abortRequest,
  api,
  baseUrl,
  clearPendingRequests,
  fetchWithAuth,
  getAdminSecret,
  injectAuthHeaders,
  setAdminSecret,
} from './client';

// Domain-specific API exports
export {
  Api,
  analyticsApi,
  authApi,
  complianceApi,
  configApi,
  customersApi,
  dashboardApi,
  integrationsApi,
  marketingApi,
  permissionsApi,
  productsApi,
  salesApi,
} from './endpoints';

// Type exports
export type {
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
  PermissionItem,
  Product,
  RecalculateAnalytics,
  RolePermissions,
  SaleItem,
  SalesByDay,
  SalesStats,
  ThemeConfig,
  TopProduct,
  TransactionItem,
  UserPreferences,
} from './types';
