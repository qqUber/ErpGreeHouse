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
  api,
  fetchWithAuth,
  baseUrl,
  getAdminSecret,
  setAdminSecret,
  injectAuthHeaders,
  clearPendingRequests,
  abortRequest,
} from './client';

// Domain-specific API exports
export {
  authApi,
  customersApi,
  salesApi,
  integrationsApi,
  productsApi,
  permissionsApi,
  marketingApi,
  analyticsApi,
  configApi,
  dashboardApi,
  complianceApi,
  Api,
} from './endpoints';

// Type exports
export type {
  SalesStats,
  SalesByDay,
  TopProduct,
  CategoryDistribution,
  RecalculateAnalytics,
  DashboardOverview,
  ChartData,
  LoyaltyReportOverview,
  LoyaltyDetailedReport,
  CustomerSegmentation,
  CustomerListItem,
  PaginationInfo,
  TransactionItem,
  CustomerDetails,
  Integration,
  IntegrationDelivery,
  IntegrationTemplate,
  DevCreateSaleResult,
  SaleItem,
  CreateSaleRequest,
  CreateSaleResponse,
  Product,
  ImportResult,
  ImportPreview,
  AdminMe,
  PermissionItem,
  RolePermissions,
  MarketingSegment,
  MarketingCampaignPreview,
  MarketingCampaign,
  MarketingTrigger,
  ConsentRecord,
  ThemeConfig,
  UserPreferences,
  DashboardPreferences,
  FeatureFlags,
} from './types';
