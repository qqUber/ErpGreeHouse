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
  dashboard: () => api<Dashboard>('/api/v1/dashboard'),
  customers: (q?: string) => api<{ items: CustomerListItem[] }>(`/api/v1/customers${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  customer: (id: number) => api<CustomerDetails>(`/api/v1/customers/${id}`),
  identifyPhone: (phone: string) => api<{ customer_id: number }>('/api/v1/identify/phone', { method: 'POST', body: JSON.stringify({ phone }) }),
  identifyQr: (qr: string) => api<{ customer_id: number }>('/api/v1/identify/qr', { method: 'POST', body: JSON.stringify({ qr }) }),
  identifyName: (name: string) => api<{ items: CustomerListItem[] }>('/api/v1/identify/name', { method: 'POST', body: JSON.stringify({ name }) }),
  createSale: (payload: any) => api<any>('/api/v1/pos/sale', { method: 'POST', body: JSON.stringify(payload) }),
  receiptUrl: (txId: number) => `${baseUrl()}/api/v1/transactions/${txId}/receipt`
}
