export type Dashboard = {
  today: string
  sales_count: number
  sales_total: number
  bonus_earned: number
  bonus_used: number
  customers_total: number
}

export type CustomerListItem = {
  id: number
  phone: string | null
  full_name: string | null
  telegram_id: number | null
  qr_token: string | null
  balance_points: number
  created_at: string
}

export type TransactionItem = {
  id: number
  created_at: string
  total_amount: number
  bonus_used: number
  bonus_earned: number
  receipt_pdf_path?: string | null
  external_erp_ref?: string | null
  items: Array<{ code: string; name: string; price: number; qty: number }>
}

export type CustomerDetails = {
  customer: {
    id: number
    phone: string | null
    full_name: string | null
    telegram_id: number | null
    qr_token: string | null
    balance_points: number
    preferences: Record<string, unknown>
    created_at: string
  }
  transactions: TransactionItem[]
}

export type Integration = {
  id: number
  name: string
  kind: string
  enabled: boolean
  secret: string
  config: Record<string, any>
}

export type IntegrationDelivery = {
  id: number
  event_type: string
  status: string
  http_status: number | null
  created_at: string
}

export type IntegrationTemplate = {
  id: string
  region: string
  name: string
  kind: string
  description: string
  config: Record<string, any>
}

function baseUrl() {
  return (import.meta as any).env.VITE_API_BASE_URL || ''
}

export function getAdminSecret() {
  try {
    return localStorage.getItem('admin_secret') || ''
  } catch {
    return ''
  }
}

export function setAdminSecret(v: string) {
  try {
    localStorage.setItem('admin_secret', v)
  } catch {
    return
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const secret = getAdminSecret()
  const headers: Record<string, string> = { ...(init?.headers as any) }
  if (secret) headers['x-admin-secret'] = secret
  if (!headers['content-type']) headers['content-type'] = 'application/json'

  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }

  return (await res.json()) as T
}

export const Api = {
  publicStatus: () => api<{ api: string; admin_auth_configured: boolean; erp_sync_enabled: boolean }>('/api/v1/public/status', { method: 'GET', headers: {} }),
  authStatus: () => api<{ bootstrap_enabled: boolean; default_admin_present: boolean; default_admin_username: string; must_change_password: boolean }>('/api/v1/public/auth/status', { method: 'GET', headers: {} }),
  login: (username: string, password: string) => api<{ token: string; must_change_password: boolean }>('/api/v1/public/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  changePassword: (old_password: string, new_password: string) => api<{ changed: boolean }>('/api/v1/auth/change-password', { method: 'POST', body: JSON.stringify({ old_password, new_password }) }),
  recoverPassword: (username: string, new_password: string, recoverySecret: string) =>
    api<{ recovered: boolean }>('/api/v1/public/auth/recover', { method: 'POST', body: JSON.stringify({ username, new_password }), headers: { 'x-admin-recovery': recoverySecret } as any }),

  dashboard: () => api<Dashboard>('/api/v1/dashboard'),
  customers: (q?: string) => api<{ items: CustomerListItem[] }>(`/api/v1/customers${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  customer: (id: number) => api<CustomerDetails>(`/api/v1/customers/${id}`),
  identifyPhone: (phone: string) => api<{ customer_id: number }>('/api/v1/identify/phone', { method: 'POST', body: JSON.stringify({ phone }) }),
  identifyQr: (qr: string) => api<{ customer_id: number }>('/api/v1/identify/qr', { method: 'POST', body: JSON.stringify({ qr }) }),
  identifyName: (name: string) => api<{ items: CustomerListItem[] }>('/api/v1/identify/name', { method: 'POST', body: JSON.stringify({ name }) }),
  createSale: (payload: any) => api<any>('/api/v1/pos/sale', { method: 'POST', body: JSON.stringify(payload) }),
  receiptUrl: (txId: number) => `${baseUrl()}/api/v1/transactions/${txId}/receipt`,

  integrations: () => api<{ items: Integration[] }>('/api/v1/integrations', { method: 'GET', headers: {} }),
  integrationTemplates: () => api<{ items: IntegrationTemplate[] }>('/api/v1/integrations/templates', { method: 'GET', headers: {} }),
  createIntegration: (payload: { name: string; kind: string; enabled: boolean; config: any }) =>
    api<{ id: number }>('/api/v1/integrations', { method: 'POST', body: JSON.stringify(payload) }),
  updateIntegration: (id: number, payload: { name: string; kind: string; enabled: boolean; config: any }) =>
    api<{ updated: boolean }>(`/api/v1/integrations/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteIntegration: (id: number) => api<{ deleted: boolean }>(`/api/v1/integrations/${id}`, { method: 'DELETE' }),
  rotateIntegrationSecret: (id: number) => api<{ secret: string }>(`/api/v1/integrations/${id}/rotate-secret`, { method: 'POST' }),
  integrationDeliveries: (id: number) => api<{ items: IntegrationDelivery[] }>(`/api/v1/integrations/${id}/deliveries`, { method: 'GET', headers: {} })
}
