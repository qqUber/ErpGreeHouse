/**
 * API Types Module
 * All TypeScript types and interfaces for the API
 */

export type SalesStats = {
  stats: Array<{ day: string; cnt: number; total: number }>;
};

export type SalesByDay = {
  sales_by_day: Array<{
    date: string;
    transactions_count: number;
    total_amount: number;
    bonus_earned: number;
  }>;
};

export type TopProduct = {
  top_products: Array<{ name: string; qty: number; revenue: number }>;
};

export type CategoryDistribution = {
  category_distribution: Array<{ name: string; qty: number; revenue: number }>;
};

export type RecalculateAnalytics = {
  recalculated: number;
};

export type DashboardOverview = {
  time_range: string;
  metrics: {
    total_customers: number;
    new_customers: number;
    total_transactions: number;
    transactions: number;
    total_revenue: number;
    revenue: number;
    avg_check: number;
    points_redeemed: number;
    points_earned: number;
    active_customers: number;
    retention_rate: number;
  };
  last_updated: string;
};

export type ChartData = {
  time_range: string;
  interval: string;
  data: Array<{
    date: string;
    transactions?: number;
    revenue?: number;
    points_redeemed?: number;
    points_earned?: number;
    new_customers?: number;
    active_customers?: number;
    customers_redeeming?: number;
  }>;
};

export type LoyaltyReportOverview = {
  time_range: string;
  metrics: {
    points_earned: number;
    points_redeemed: number;
    redemption_rate: number;
    avg_points_per_transaction: number;
    avg_points_redeemed_per_customer: number;
    avg_visits_per_redeeming_customer: number;
    reminder_count: number;
  };
};

export type LoyaltyDetailedReport = {
  time_range: string;
  customer_data: Array<{
    customer_id: number;
    full_name: string;
    phone: string;
    transaction_count: number;
    total_spent: number;
    points_earned: number;
    points_redeemed: number;
    last_transaction: string;
  }>;
};

export type CustomerSegmentation = {
  segments: {
    new: { count: number; avg_monetary: number; avg_frequency: number };
    active: { count: number; avg_monetary: number; avg_frequency: number };
    at_risk: { count: number; avg_monetary: number; avg_frequency: number };
    churned: { count: number; avg_monetary: number; avg_frequency: number };
    vip: { count: number; avg_monetary: number; avg_frequency: number };
  };
  total_customers: number;
};

export type CustomerListItem = {
  id: number;
  phone: string | null;
  full_name: string | null;
  telegram_id: number | null;
  qr_token: string | null;
  balance_points: number;
  birthday?: string | null;
  gender?: string | null;
  email?: string | null;
  city?: string | null;
  onboarding_status?: string | null;
  created_at: string;
};

export type PaginationInfo = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
};

export type TransactionItem = {
  id: number;
  created_at: string;
  total_amount: number;
  bonus_used: number;
  bonus_earned: number;
  customer_id?: number;
  customer_name?: string;
  product_names?: string;
  receipt_pdf_path?: string | null;
  external_erp_ref?: string | null;
  items: Array<{ code: string; name: string; price: number; qty: number }>;
};

export type CustomerDetails = {
  customer: {
    id: number;
    phone: string | null;
    full_name: string | null;
    telegram_id: number | null;
    qr_token: string | null;
    balance_points: number;
    birthday?: string | null;
    gender?: string | null;
    email?: string | null;
    city?: string | null;
    onboarding_status?: string | null;
    phone_verified_at?: string | null;
    phone_verification_method?: string | null;
    preferences: Record<string, unknown>;
    created_at: string;
  };
  transactions: TransactionItem[];
};

export type Integration = {
  id: number;
  name: string;
  kind: string;
  enabled: boolean;
  secret: string;
  config: Record<string, any>;
};

export type IntegrationDelivery = {
  id: number;
  event_type: string;
  status: string;
  http_status: number | null;
  created_at: string;
};

export type IntegrationTemplate = {
  id: string;
  region: string;
  name: string;
  kind: string;
  description: string;
  config: Record<string, any>;
};

export type DevCreateSaleResult = {
  accepted: boolean;
  duplicate?: boolean;
  transaction_id: number;
  customer_id: number;
  integration_id: number;
  receipt_id: string;
  debug_mode: boolean;
};

export type SaleItem = {
  code: string;
  name: string;
  price: number;
  qty: number;
};

export type CreateSaleRequest = {
  customer_id: number;
  items: SaleItem[];
  requested_bonus?: number;
};

export type CreateSaleResponse = {
  accepted?: boolean;
  transaction_id: number;
  customer_id: number;
  bonus_used?: number;
  bonus_earned?: number;
};

export type Product = {
  id: number;
  code: string;
  name: string;
  kind: string;
  price: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type ImportResult = {
  total: number;
  created: number;
  updated: number;
  errors: string[];
  preview: Array<{ name: string; sku: string; category: string; price: number }>;
};

export type ImportPreview = {
  headers: string[];
  rows: Array<{
    row: number | string;
    name: string;
    sku: string;
    category: string;
    price: string;
    description: string;
  }>;
  total_rows: number;
};

export type AdminMe = {
  user_id: number;
  username: string;
  role: string;
  permissions: string[];
};

export type PermissionItem = {
  permission: string;
  is_allowed: boolean;
};

export type RolePermissions = {
  role: string;
  permissions: PermissionItem[];
};

export type MarketingSegment = {
  id: number;
  name: string;
  criteria: Record<string, any>;
  created_at: string;
};

export type MarketingCampaignPreview = {
  audience_preview: Array<Record<string, any>>;
  rendered_messages: Array<{
    customer_id: number;
    customer_name: string;
    message: string;
  }>;
  estimated_recipients: number;
};

export type MarketingCampaign = {
  id: number;
  name: string;
  segment_id: number | null;
  type: string;
  content: string;
  content_type: string;
  media_urls: string | null;
  caption: string | null;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  budget_limit?: number | null;
  budget_spent?: number;
  audience_count?: number;
  started_at?: string | null;
  paused_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  stats: Record<string, any> | null;
  created_at: string;
  updated_at?: string;
};

export type MarketingTrigger = {
  id: number;
  name: string;
  event_source: string;
  criteria_json: Record<string, any>;
  delay_hours: number;
  message_text: string;
  media_type: string | null;
  media_url: string | null;
  caption: string | null;
  active: boolean;
  created_at: string;
};

export type ConsentRecord = {
  id: number;
  customer_id: number;
  source: string;
  consent_version: string;
  consent_text: string;
  consent_type: string;
  accepted_at: string;
};

// Theme/Config Types
export type ThemeConfig = {
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  brandName: string;
  borderRadius: 'sm' | 'md' | 'lg';
};

export type UserPreferences = {
  theme: 'light' | 'dark' | 'auto';
  density: 'compact' | 'comfortable' | 'spacious';
  locale: string;
  sidebarCollapsed: boolean;
};

export type DashboardPreferences = {
  widgetOrder: string[];
  visibleWidgets: string[];
  columnCount: number;
};

export type FeatureFlags = {
  marketingEnabled: boolean;
  analyticsEnabled: boolean;
  complianceEnabled: boolean;
  loyaltyEnabled: boolean;
};
