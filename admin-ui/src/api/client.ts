/**
 * API Client Module
 * Core HTTP client with auth interceptors
 */

// Request queue for token refresh
let isRefreshing = false;
let refreshRetryCount = 0;
const MAX_REFRESH_RETRIES = 3;
const REFRESH_RETRY_DELAY_MS = 500;
let pendingRequests: Array<(success: boolean) => void> = [];
const TOKEN_VALIDATION_KEY = 'auth_validation_state';

// Event listener for aborting requests on navigation
const AbortControllers = new Map<string, AbortController>();

const TOKEN_STORAGE_KEY = 'admin_session_token';
let _adminSecret = '';

// Restore token from localStorage on page load
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
  if (typeof localStorage !== 'undefined') {
    if (v) {
      localStorage.setItem(TOKEN_STORAGE_KEY, v);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }
}

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

export function abortRequest(requestId: string) {
  const controller = AbortControllers.get(requestId);
  if (controller) {
    controller.abort();
    AbortControllers.delete(requestId);
  }
}

function createTrackedAbortController(requestId: string): AbortController {
  const controller = new AbortController();
  AbortControllers.set(requestId, controller);
  controller.signal.addEventListener('abort', () => {
    AbortControllers.delete(requestId);
  });
  return controller;
}

export function injectAuthHeaders(headers: Record<string, string> = {}): Record<string, string> {
  const secret = getAdminSecret();
  if (!secret) {
    return headers;
  }

  const isJwtFormat = (secret.match(/\./g) || []).length === 2;

  if (isJwtFormat) {
    headers.Authorization = `Bearer ${secret}`;
    console.log('[Api] JWT token detected, using Authorization Bearer header');
  } else {
    headers['x-admin-secret'] = secret;
    console.log('[Api] Legacy secret detected, using x-admin-secret header only');
  }

  return headers;
}

export function baseUrl() {
  const envUrl = (import.meta as any).env.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim()) {
    const normalized = envUrl.trim();
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
        // Keep normalized value on parse errors
      }
    }
    return normalized;
  }
  return '';
}

async function parseError(response: Response): Promise<Error> {
  const text = await response.text();
  let errorMsg = `HTTP ${response.status}`;
  try {
    const j = JSON.parse(text);
    if (j?.detail) errorMsg = String(j.detail);
  } catch {}
  return new Error(errorMsg);
}

async function refreshTokenInternal(): Promise<boolean> {
  refreshRetryCount = 0;

  while (refreshRetryCount < MAX_REFRESH_RETRIES) {
    try {
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

      if (refreshRetryCount >= MAX_REFRESH_RETRIES) {
        console.error(
          '[fetchWithAuth] Max refresh retries reached due to network error, will redirect to login'
        );
        return false;
      }
    }
  }

  return false;
}

export async function fetchWithAuth(
  url: string,
  options: RequestInit & { requestId?: string } = {}
): Promise<Response> {
  const { requestId, ...fetchOptions } = options;

  const id = requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  let controller: AbortController | undefined;
  if (!fetchOptions.signal) {
    controller = createTrackedAbortController(id);
    fetchOptions.signal = controller.signal;
  }

  const headers: Record<string, string> = {
    ...((fetchOptions.headers as Record<string, string>) || {}),
  };

  const authHeaders = injectAuthHeaders(headers);
  Object.assign(headers, authHeaders);

  if (!headers['content-type'] && !(fetchOptions.body instanceof FormData)) {
    headers['content-type'] = 'application/json';
  }

  fetchOptions.credentials = fetchOptions.credentials || 'include';
  fetchOptions.headers = headers;

  const makeRequest = async (): Promise<Response> => {
    const response = await fetch(`${baseUrl()}${url}`, fetchOptions);

    const isRefreshEndpoint = url.includes('/auth/refresh');

    if (response.status === 401) {
      if (isRefreshEndpoint) {
        console.error('[fetchWithAuth] Refresh endpoint returned 401, redirecting to login...');
        processQueue(false);
        isRefreshing = false;
        if (typeof window !== 'undefined') {
          clearClientAuthState();
          const loginPath = '/admin/login';
          if (typeof window !== 'undefined' && window.location.pathname !== loginPath) {
            window.location.href = loginPath;
          }
        }
        return Promise.reject(new Error('Session expired'));
      }

      console.error(`[fetchWithAuth] Received 401 for ${url}, attempting token refresh...`);

      if (isRefreshing) {
        console.log('[fetchWithAuth] Token refresh in progress, queuing request...');
        return new Promise((resolve, reject) => {
          pendingRequests.push(async (refreshSuccess: boolean) => {
            if (!refreshSuccess) {
              reject(new Error('Token refresh failed'));
              return;
            }
            try {
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

      isRefreshing = true;

      const hadValidSession =
        typeof sessionStorage !== 'undefined' &&
        sessionStorage.getItem(TOKEN_VALIDATION_KEY) === 'valid';

      if (!hadValidSession) {
        console.log('[fetchWithAuth] No previous valid session, skipping refresh attempt');
        isRefreshing = false;
        processQueue(false);
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
        const refreshResult = await refreshTokenInternal();

        if (refreshResult) {
          console.log('[fetchWithAuth] Token refreshed successfully, retrying request...');
          processQueue(true);

          const retryResponse = await fetch(`${baseUrl()}${url}`, fetchOptions);

          if (!retryResponse.ok) {
            throw await parseError(retryResponse);
          }

          return retryResponse;
        } else {
          console.error('[fetchWithAuth] Token refresh failed, redirecting to login...');
          processQueue(false);
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
    if (controller) {
      AbortControllers.delete(id);
    }
    return response;
  } catch (error) {
    if (controller) {
      AbortControllers.delete(id);
    }
    throw error;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
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
