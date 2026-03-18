export type DashboardKPI = {
  today: string;
  sales_count: number;
  sales_total: number;
  bonus_earned: number;
  bonus_used: number;
  customers_total: number;
  recent_activity: {
    transactions: Array<{
      id: number;
      created_at: string;
      total_amount: number;
      bonus_earned: number;
      bonus_used: number;
      customer_id: number;
      customer_name: string;
      product_names: string;
    }>;
    marketing_events: Array<{
      id: number;
      created_at: string;
      status: string;
      trigger_name: string;
    }>;
  };
};

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

// Analytics types
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
  stats: Record<string, any> | null;
  created_at: string;
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

// Request queue for token refresh
let isRefreshing = false;
let refreshRetryCount = 0;
const MAX_REFRESH_RETRIES = 3;
const REFRESH_RETRY_DELAY_MS = 500;
let pendingRequests: Array<(success: boolean) => void> = [];
const TOKEN_VALIDATION_KEY = 'auth_validation_state';

// Event listener for aborting requests on navigation
const AbortControllers = new Map<string, AbortController>();

/**
 * Process queued requests after token refresh
 */
function processQueue(success: boolean) {
  pendingRequests.forEach((callback) => {
    callback(success);
  });
  pendingRequests = [];
}

function clearClientAuthState() {
  setAdminSecret('');
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(TOKEN_VALIDATION_KEY);
  }
}

/**
 * Clear all pending requests (e.g., on logout or navigation)
 */
export function clearPendingRequests() {
  AbortControllers.forEach((controller) => {
    controller.abort();
  });
  AbortControllers.clear();
  pendingRequests.forEach((callback) => {
    callback(false);
  });
  pendingRequests = [];
}

/**
 * Abort a specific request by ID
 */
export function abortRequest(requestId: string) {
  const controller = AbortControllers.get(requestId);
  if (controller) {
    controller.abort();
    AbortControllers.delete(requestId);
  }
}

/**
 * Create an AbortController and track it
 */
function createTrackedAbortController(requestId: string): AbortController {
  const controller = new AbortController();
  AbortControllers.set(requestId, controller);

  // Clean up when aborted
  controller.signal.addEventListener('abort', () => {
    AbortControllers.delete(requestId);
  });

  return controller;
}

/**
 * Fetch wrapper with auth interceptors - similar to Axios interceptors
 * - Request interceptor: adds auth headers
 * - Response interceptor: handles 401 errors and token refresh
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit & { requestId?: string } = {}
): Promise<Response> {
  const { requestId, ...fetchOptions } = options;

  // Generate request ID if not provided
  const id = requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Create abort controller for this request
  let controller: AbortController | undefined;
  if (!fetchOptions.signal) {
    controller = createTrackedAbortController(id);
    fetchOptions.signal = controller.signal;
  }

  // Request interceptor: add auth headers using centralized logic
  const headers: Record<string, string> = {
    ...((fetchOptions.headers as Record<string, string>) || {}),
  };

  // Use centralized header injection for consistent auth handling
  const authHeaders = injectAuthHeaders(headers);
  Object.assign(headers, authHeaders);

  if (!headers['content-type'] && !(fetchOptions.body instanceof FormData)) {
    headers['content-type'] = 'application/json';
  }

  // Ensure credentials are included for cookies
  fetchOptions.credentials = fetchOptions.credentials || 'include';
  fetchOptions.headers = headers;

  const makeRequest = async (): Promise<Response> => {
    const response = await fetch(`${baseUrl()}${url}`, fetchOptions);

    // Response interceptor: handle 401 errors
    const isRefreshEndpoint = url.includes('/auth/refresh');

    if (response.status === 401) {
      // If this is the refresh endpoint itself failing, don't retry - just redirect
      if (isRefreshEndpoint) {
        console.error('[fetchWithAuth] Refresh endpoint returned 401, redirecting to login...');
        processQueue(false);
        isRefreshing = false;
        if (typeof window !== 'undefined') {
          clearClientAuthState();
          // Use router if available, otherwise fall back to href
          const loginPath = '/admin/login';
          if (typeof window !== 'undefined' && window.location.pathname !== loginPath) {
            window.location.href = loginPath;
          }
        }
        return Promise.reject(new Error('Session expired'));
      }

      console.error(`[fetchWithAuth] Received 401 for ${url}, attempting token refresh...`);

      // If already refreshing, queue this request
      if (isRefreshing) {
        console.log('[fetchWithAuth] Token refresh in progress, queuing request...');
        return new Promise((resolve, reject) => {
          pendingRequests.push(async (refreshSuccess: boolean) => {
            if (!refreshSuccess) {
              reject(new Error('Token refresh failed'));
              return;
            }
            try {
              // Retry the request with new token
              const retryResponse = await fetch(`${baseUrl()}${url}`, fetchOptions);
              if (!retryResponse.ok) {
                const error = await parseError(retryResponse);
                reject(error);
              } else {
                resolve(retryResponse);
              }
            } catch (err) {
              reject(err);
            }
          });
        });
      }

      // Start token refresh
      isRefreshing = true;

      // Check if there's a previous valid session before attempting refresh
      // This prevents the 401 refresh loop when user is not logged in
      const hadValidSession =
        typeof sessionStorage !== 'undefined' &&
        sessionStorage.getItem(TOKEN_VALIDATION_KEY) === 'valid';

      if (!hadValidSession) {
        console.log('[fetchWithAuth] No previous valid session, skipping refresh attempt');
        isRefreshing = false;
        processQueue(false);
        // Redirect to login without trying to refresh - but check if already on login
        if (typeof window !== 'undefined') {
          clearClientAuthState();
          const loginPath = '/admin/login';
          if (window.location.pathname !== loginPath) {
            window.location.href = loginPath;
          }
        }
        throw new Error('Session expired. Please log in again.');
      }

      try {
        // Call refresh endpoint
        const refreshResult = await refreshTokenInternal();

        if (refreshResult) {
          console.log('[fetchWithAuth] Token refreshed successfully, retrying request...');
          // Process queue with success
          processQueue(true);

          // Retry the original request
          const retryResponse = await fetch(`${baseUrl()}${url}`, fetchOptions);

          if (!retryResponse.ok) {
            throw await parseError(retryResponse);
          }

          return retryResponse;
        } else {
          console.error('[fetchWithAuth] Token refresh failed, redirecting to login...');
          processQueue(false);
          // Redirect to login - but check if already on login page
          if (typeof window !== 'undefined') {
            clearClientAuthState();
            const loginPath = '/admin/login';
            if (window.location.pathname !== loginPath) {
              window.location.href = loginPath;
            }
          }
          throw new Error('Session expired. Please log in again.');
        }
      } catch (refreshError) {
        console.error('[fetchWithAuth] Token refresh error:', refreshError);
        processQueue(false);
        // Redirect to login on refresh failure
        if (typeof window !== 'undefined') {
          clearClientAuthState();
          window.location.href = '/admin/login';
        }
        throw refreshError;
      } finally {
        isRefreshing = false;
      }
    }

    return response;
  };

  try {
    const response = await makeRequest();
    // Clean up abort controller on success
    if (controller) {
      AbortControllers.delete(id);
    }
    return response;
  } catch (error) {
    // Clean up abort controller on error
    if (controller) {
      AbortControllers.delete(id);
    }
    throw error;
  }
}

/**
 * Internal refresh token function (used by interceptor)
 * Includes retry logic with maximum attempts and delay
 */
async function refreshTokenInternal(): Promise<boolean> {
  // Reset retry count on a new refresh attempt
  refreshRetryCount = 0;

  while (refreshRetryCount < MAX_REFRESH_RETRIES) {
    try {
      // Add delay between retries (skip on first attempt)
      if (refreshRetryCount > 0) {
        console.log(
          `[fetchWithAuth] Waiting ${REFRESH_RETRY_DELAY_MS}ms before retry ${refreshRetryCount + 1}/${MAX_REFRESH_RETRIES}...`
        );
        await new Promise((resolve) => setTimeout(resolve, REFRESH_RETRY_DELAY_MS));
      }

      const response = await fetch(`${baseUrl()}/api/v1/public/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('[fetchWithAuth] Refresh token successful');
        return true;
      } else if (response.status === 401) {
        console.log('[fetchWithAuth] Refresh token expired, clearing client auth state');
        clearClientAuthState();
        return false;
      } else {
        console.log(`[fetchWithAuth] Refresh token failed with status: ${response.status}`);
        refreshRetryCount++;
      }
    } catch (error) {
      console.log(
        `[fetchWithAuth] Refresh token network error: ${error} (attempt ${refreshRetryCount + 1}/${MAX_REFRESH_RETRIES})`
      );
      refreshRetryCount++;

      // If we've exhausted retries, return false
      if (refreshRetryCount >= MAX_REFRESH_RETRIES) {
        console.error(
          '[fetchWithAuth] Max refresh retries reached due to network error, will redirect to login'
        );
        return false;
      }
    }
  }

  // Should not reach here, but just in case
  return false;
}

/**
 * Parse error response
 */
async function parseError(response: Response): Promise<Error> {
  const text = await response.text();
  let errorMsg = `HTTP ${response.status}`;
  try {
    const j = JSON.parse(text);
    if (j?.detail) errorMsg = String(j.detail);
  } catch {}
  return new Error(errorMsg);
}

export function baseUrl() {
  // In development, Vite proxies /api to localhost:8000
  // Use explicit URL if VITE_API_BASE_URL is set, otherwise rely on Vite proxy
  const envUrl = (import.meta as any).env.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim()) {
    const normalized = envUrl.trim();
    // In dockerized frontend configs, VITE_API_BASE_URL is often set to internal
    // hostnames like "backend". When browser runs on host OS, that hostname is not
    // resolvable. In that case, fall back to relative "/api" via Vite proxy.
    if (typeof window !== 'undefined') {
      try {
        const parsed = new URL(normalized);
        const browserHost = window.location.hostname;
        const isBrowserLocal = browserHost === 'localhost' || browserHost === '127.0.0.1';
        const isDockerInternalHost =
          parsed.hostname === 'backend' || parsed.hostname === 'frontend';
        if (isBrowserLocal && isDockerInternalHost) {
          return '';
        }
      } catch {
        // Keep normalized value on parse errors.
      }
    }
    return normalized;
  }
  // In development, return empty string to use Vite proxy
  // In production, this should be set to the actual API URL
  return '';
}

const TOKEN_STORAGE_KEY = 'admin_session_token';
let _adminSecret = '';

// Восстанавливаем токен из localStorage при загрузке страницы
const cachedToken =
  typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
if (cachedToken) {
  _adminSecret = cachedToken;
  console.log('[Api] Token restored from localStorage');
}

export function getAdminSecret() {
  return _adminSecret;
}

export function setAdminSecret(v: string) {
  _adminSecret = String(v || '');
  // Сохраняем токен в localStorage для сохранения сессии
  if (typeof localStorage !== 'undefined') {
    if (v) {
      localStorage.setItem(TOKEN_STORAGE_KEY, v);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }
}

/**
 * Centralized header injection logic
 * Rule: Static secrets must NEVER be sent in Authorization: Bearer header
 * Only JWT tokens should use Bearer header
 * Static secrets use x-admin-secret header for legacy compatibility
 */
export function injectAuthHeaders(headers: Record<string, string> = {}): Record<string, string> {
  const secret = getAdminSecret();
  if (!secret) {
    return headers;
  }

  // Check if token is JWT format (exactly two dots)
  const isJwtFormat = (secret.match(/\./g) || []).length === 2;

  if (isJwtFormat) {
    // JWT token - use Authorization Bearer header ONLY
    // Do NOT also send in x-admin-secret
    headers.Authorization = `Bearer ${secret}`;
    console.log('[Api] JWT token detected, using Authorization Bearer header');
  } else {
    // Legacy static secret - use x-admin-secret header ONLY
    // Do NOT also send in Authorization header
    headers['x-admin-secret'] = secret;
    console.log('[Api] Legacy secret detected, using x-admin-secret header only');
  }

  return headers;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  // Use centralized header injection for consistent auth handling
  const headers: Record<string, string> = {
    ...(init?.headers as any),
    ...injectAuthHeaders(),
  };

  if (!headers['content-type'] && !(init?.body instanceof FormData))
    headers['content-type'] = 'application/json';

  const res = await fetchWithAuth(path, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    console.log(`[Api] Error ${res.status}, reading body...`);
    const text = await res.text();
    console.error(`[Api] Error ${res.status} body: "${text}"`);
    let errorMsg = `HTTP ${res.status}`;
    try {
      const j = JSON.parse(text || '{}');
      if (j?.detail) errorMsg = String(j.detail);
    } catch (err) {
      console.error('[Api] JSON parse error:', err);
    }
    console.error(`[Api] Throwing error: "${errorMsg}"`);
    throw new Error(errorMsg);
  }

  return (await res.json()) as T;
}

export const Api = {
  publicStatus: (signal?: AbortSignal) =>
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

  dashboard: (signal?: AbortSignal) => api<DashboardKPI>('/api/v1/dashboard', { signal }),
  customers: (q?: string, page?: number, limit?: number, signal?: AbortSignal) => {
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
  customer: (id: number) => api<CustomerDetails>(`/api/v1/customers/${id}`),
  createCustomer: (payload: { full_name: string; phone?: string; notes?: string }) =>
    api<{ id: number; qr_token: string }>('/api/v1/customers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  identifyPhone: (phone: string) =>
    api<{ customer_id: number }>('/api/v1/identify/phone', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),
  identifyQr: (qr: string) =>
    api<{ customer_id: number }>('/api/v1/identify/qr', {
      method: 'POST',
      body: JSON.stringify({ qr }),
    }),
  identifyName: (name: string) =>
    api<{ items: CustomerListItem[] }>('/api/v1/identify/name', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  createSale: (payload: any) =>
    api<any>('/api/v1/pos/sale', { method: 'POST', body: JSON.stringify(payload) }),
  receiptUrl: (txId: number) => `${baseUrl()}/api/v1/transactions/${txId}/receipt`,

  integrations: () => api<Integration[]>('/api/v1/integrations', { method: 'GET', headers: {} }),
  integrationTemplates: () =>
    api<{ items: IntegrationTemplate[] }>('/api/v1/integrations/templates', {
      method: 'GET',
      headers: {},
    }),
  createIntegration: (payload: { name: string; kind: string; enabled: boolean; config: any }) =>
    api<{ id: number }>('/api/v1/integrations', { method: 'POST', body: JSON.stringify(payload) }),
  updateIntegration: (
    id: number,
    payload: { name: string; kind: string; enabled: boolean; config: any }
  ) =>
    api<{ updated: boolean }>(`/api/v1/integrations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteIntegration: (id: number) =>
    api<{ deleted: boolean }>(`/api/v1/integrations/${id}`, { method: 'DELETE' }),
  rotateIntegrationSecret: (id: number) =>
    api<{ secret: string }>(`/api/v1/integrations/${id}/rotate-secret`, { method: 'POST' }),
  integrationDeliveries: (id: number) =>
    api<{ items: IntegrationDelivery[] }>(`/api/v1/integrations/${id}/deliveries`, {
      method: 'GET',
      headers: {},
    }),
  products: (q?: string, page?: number, limit?: number) => {
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
  createProduct: (payload: {
    code: string;
    name: string;
    kind: string;
    price: number;
    active: boolean;
  }) => api<{ id: number }>('/api/v1/products', { method: 'POST', body: JSON.stringify(payload) }),
  importProducts: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api<ImportResult>('/api/v1/products/import/file', {
      method: 'POST',
      body: formData,
    });
  },
  importProductsUrl: (url: string, format: 'json' | 'xml' = 'json') =>
    api<ImportResult>('/api/v1/products/import/url', {
      method: 'POST',
      body: JSON.stringify({ url, format }),
    }),
  previewProductsImport: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api<ImportPreview>('/api/v1/products/import/preview', {
      method: 'GET',
      body: formData,
    });
  },
  permissions: () =>
    api<{ items: RolePermissions[]; all_permissions: string[] }>('/api/v1/roles/permissions'),
  updatePermission: (role: string, permission: string, is_allowed: boolean) =>
    api<{ success: boolean }>('/api/v1/roles/permissions', {
      method: 'POST',
      body: JSON.stringify({ role, permission, is_allowed }),
    }),
  marketingSegments: () => api<{ items: MarketingSegment[] }>('/api/v1/marketing/segments'),
  createMarketingSegment: (payload: { name: string; criteria: any }) =>
    api<{ id: number }>('/api/v1/marketing/segments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  marketingCampaigns: () => api<{ items: MarketingCampaign[] }>('/api/v1/marketing/campaigns'),
  createMarketingCampaign: (payload: {
    name: string;
    segment_id: number | null;
    type: string;
    content: string;
    content_type?: string;
    media_urls?: string;
    caption?: string;
    scheduled_at?: string;
  }) =>
    api<{ id: number }>('/api/v1/marketing/campaigns', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  sendMarketingCampaign: (id: number) =>
    api<{ success: boolean }>(`/api/v1/marketing/campaigns/${id}/send`, { method: 'POST' }),

  marketingTriggers: () => api<{ items: MarketingTrigger[] }>('/api/v1/marketing/triggers'),
  createMarketingTrigger: (payload: {
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
  salesStats: (days: number) => api<SalesStats>(`/api/v1/stats/sales?days=${days}`),

  // Analytics endpoints
  salesByDay: (days: number = 30) => api<SalesByDay>(`/api/v1/analytics/sales-by-day?days=${days}`),
  topProducts: (days: number = 30, limit: number = 10) =>
    api<TopProduct>(`/api/v1/analytics/top-products?days=${days}&limit=${limit}`),
  categoryDistribution: (days: number = 30) =>
    api<CategoryDistribution>(`/api/v1/analytics/category-distribution?days=${days}`),
  recalculateAnalytics: () =>
    api<RecalculateAnalytics>('/api/v1/analytics/recalculate', { method: 'POST' }),

  // Dashboard endpoints
  dashboardOverview: (timeRange: string = '7d') =>
    api<DashboardOverview>(`/api/v1/analytics/dashboard/overview?time_range=${timeRange}`),
  salesChart: (timeRange: string = '7d', interval: string = 'day') =>
    api<ChartData>(
      `/api/v1/analytics/dashboard/sales?time_range=${timeRange}&interval=${interval}`
    ),
  customerChart: (timeRange: string = '7d', interval: string = 'day') =>
    api<ChartData>(
      `/api/v1/analytics/dashboard/customers?time_range=${timeRange}&interval=${interval}`
    ),
  loyaltyChart: (timeRange: string = '7d', interval: string = 'day') =>
    api<ChartData>(
      `/api/v1/analytics/dashboard/loyalty?time_range=${timeRange}&interval=${interval}`
    ),

  // New enterprise dashboard endpoints
  dashboardOperational: () =>
    api<import('./hooks/useDashboard').OperationalData>('/api/v1/dashboard/operational'),
  dashboardMarketing: () =>
    api<import('./hooks/useDashboard').MarketingData>('/api/v1/dashboard/marketing'),
  dashboardCustomers: () =>
    api<import('./hooks/useDashboard').CustomerData>('/api/v1/dashboard/customers'),
  dashboardProducts: () =>
    api<import('./hooks/useDashboard').ProductData>('/api/v1/dashboard/products'),
  dashboardIntegrations: () =>
    api<import('./hooks/useDashboard').IntegrationData>('/api/v1/dashboard/integrations'),

  // Marketing analytics for widget
  marketingAnalytics: () =>
    api<import('./components/dashboard/AnalyticsWidget').MarketingAnalyticsData>(
      '/api/v1/analytics/dashboard/marketing'
    ),

  // Loyalty reports
  loyaltyReportOverview: (timeRange: string = '30d') =>
    api<LoyaltyReportOverview>(
      `/api/v1/analytics/reports/loyalty/overview?time_range=${timeRange}`
    ),
  loyaltyDetailedReport: (timeRange: string = '30d') =>
    api<LoyaltyDetailedReport>(
      `/api/v1/analytics/reports/loyalty/detailed?time_range=${timeRange}`
    ),

  // Customer segmentation
  customerSegmentation: () => api<CustomerSegmentation>('/api/v1/analytics/customers/segmentation'),

  // Data export endpoints
  exportLoyaltyReport: (timeRange: string = '30d') =>
    fetchWithAuth(`/api/v1/analytics/export/loyalty/csv?time_range=${timeRange}`, {
      method: 'GET',
    }),
  exportSalesReport: (timeRange: string = '30d') =>
    fetchWithAuth(`/api/v1/analytics/export/sales/csv?time_range=${timeRange}`, {
      method: 'GET',
    }),
  exportCustomersReport: (timeRange: string = '30d') =>
    fetchWithAuth(`/api/v1/analytics/export/customers/csv?time_range=${timeRange}`, {
      method: 'GET',
    }),

  // Integration Settings API
  getIntegrationsStatus: () => api<{ telegram: any; vk: any }>('/api/v1/admin/integrations/status'),
  getTelegramStatus: () =>
    api<{ enabled: boolean; configured: boolean; bot_token_set: boolean; config: any }>(
      '/api/v1/admin/integrations/telegram/status'
    ),
  validateTelegramToken: (bot_token: string, enabled: boolean) =>
    api<{
      valid: boolean;
      bot_id?: number;
      bot_username?: string;
      bot_first_name?: string;
      error?: string;
    }>('/api/v1/admin/integrations/telegram/validate', {
      method: 'POST',
      body: JSON.stringify({ bot_token, enabled }),
    }),
  saveTelegramSettings: (
    bot_token: string,
    enabled: boolean,
    support_chat_id: string,
    menu_items: Array<{
      id: string;
      label: string;
      text?: string;
      media_urls?: string[];
      button_text?: string;
      button_url?: string;
      use_text?: boolean;
      use_media?: boolean;
      use_button?: boolean;
      use_city_list?: boolean;
      use_support_forward?: boolean;
      city_entries?: Array<{
        city: string;
        text?: string;
        media_urls?: string[];
        button_text?: string;
        button_url?: string;
      }>;
    }>
  ) =>
    api<{ saved: boolean }>('/api/v1/admin/integrations/telegram/save', {
      method: 'POST',
      body: JSON.stringify({ bot_token, enabled, support_chat_id, menu_items }),
    }),
  uploadTelegramMedia: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api<{ uploaded: boolean; url: string; name: string }>(
      '/api/v1/admin/integrations/telegram/upload_media',
      {
        method: 'POST',
        body: formData,
        headers: {},
      }
    );
  },
  setTelegramWebhook: (webhook_url?: string, secret?: string) =>
    api<{ webhook_set: boolean; url: string; secret: string }>(
      '/api/v1/admin/integrations/telegram/set_webhook',
      {
        method: 'POST',
        body: JSON.stringify({ webhook_url, secret }),
      }
    ),
  getVkStatus: () =>
    api<{ enabled: boolean; configured: boolean; group_id: number | null; api_version: string }>(
      '/api/v1/admin/integrations/vk/status'
    ),
  validateVkToken: (
    access_token: string,
    group_id: number,
    api_version: string,
    enabled: boolean
  ) =>
    api<{ valid: boolean; group_name?: string; group_id?: number; error?: string }>(
      '/api/v1/admin/integrations/vk/validate',
      {
        method: 'POST',
        body: JSON.stringify({ access_token, group_id, api_version, enabled }),
      }
    ),
  saveVkSettings: (access_token: string, group_id: number, api_version: string, enabled: boolean) =>
    api<{ saved: boolean }>('/api/v1/admin/integrations/vk/save', {
      method: 'POST',
      body: JSON.stringify({ access_token, group_id, api_version, enabled }),
    }),
  setVkWebhook: (webhook_url?: string, secret?: string) =>
    api<{ webhook_set: boolean; url: string; secret: string; note: string }>(
      '/api/v1/admin/integrations/vk/set_webhook',
      {
        method: 'POST',
        body: JSON.stringify({ webhook_url, secret }),
      }
    ),
  createDevSale: (customer_qr: string) =>
    api<DevCreateSaleResult>('/api/v1/integrations/dev/create-sale', {
      method: 'POST',
      body: JSON.stringify({ customer_qr }),
    }),

  // Compliance endpoints
  listConsents: (customerId?: number) =>
    api<{ items: ConsentRecord[] }>(
      `/api/v1/compliance/consents${customerId ? `?customer_id=${customerId}` : ''}`,
      { method: 'GET', headers: {} }
    ),

  getCustomerConsents: (customerId: number) =>
    api<{ items: ConsentRecord[] }>(`/api/v1/compliance/consents/${customerId}`, {
      method: 'GET',
      headers: {},
    }),

  deleteCustomer: (customerId: number) =>
    api<{ status: string }>(`/api/v1/compliance/customers/${customerId}`, {
      method: 'DELETE',
      headers: {},
    }),
};
