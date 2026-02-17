import React, { useEffect, useMemo, useState } from 'react'
import { Api, CustomerDetails, CustomerListItem, Dashboard, getAdminSecret, setAdminSecret } from './api'

type Tab = 'dashboard' | 'customers' | 'pos'

type PublicStatus = {
  api: string
  admin_auth_configured: boolean
  erp_sync_enabled: boolean
}

function money(n: number) {
  return new Intl.NumberFormat('ru-RU').format(n)
}

function App() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [dash, setDash] = useState<Dashboard | null>(null)
  const [customers, setCustomers] = useState<CustomerListItem[]>([])
  const [q, setQ] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [details, setDetails] = useState<CustomerDetails | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [publicStatus, setPublicStatus] = useState<PublicStatus | null>(null)
  const [adminKey, setAdminKey] = useState(getAdminSecret())
  const [authReady, setAuthReady] = useState(false)

  const selected = useMemo(() => customers.find(c => c.id === selectedId) || null, [customers, selectedId])

  async function loadPublicStatus() {
    try {
      const s = await Api.publicStatus()
      setPublicStatus(s)
    } catch {
      setPublicStatus(null)
    }
  }

  async function loadDashboard() {
    setError(null)
    const d = await Api.dashboard()
    setDash(d)
  }

  async function loadCustomers(query?: string) {
    setError(null)
    const res = await Api.customers(query)
    setCustomers(res.items)
  }

  async function loadCustomer(id: number) {
    setError(null)
    const d = await Api.customer(id)
    setDetails(d)
  }

  async function bootstrap() {
    setError(null)
    await loadPublicStatus()
    if (!getAdminSecret()) {
      setAuthReady(false)
      return
    }
    try {
      await Promise.all([loadDashboard(), loadCustomers()])
      setAuthReady(true)
    } catch (e: any) {
      const msg = String(e?.message || e)
      if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
        setAuthReady(false)
        setError('Доступ запрещён. Проверьте ключ администратора.')
        return
      }
      setError(msg)
    }
  }

  useEffect(() => {
    bootstrap()
  }, [])

  useEffect(() => {
    if (selectedId != null && authReady) {
      loadCustomer(selectedId).catch(e => setError(String(e)))
    }
  }, [selectedId, authReady])

  async function doLogin() {
    setAdminSecret(adminKey.trim())
    await bootstrap()
  }

  return (
    <div className="container">
      <div className="header">
        <div className="brand">
          <div style={{ fontWeight: 800 }}>CRM · Администрирование</div>
          <div className="badge">Enterprise</div>
        </div>
        <div className="tabs">
          <div className={`tab ${tab === 'dashboard' ? 'tabActive' : ''}`} onClick={() => setTab('dashboard')}>Сводка</div>
          <div className={`tab ${tab === 'customers' ? 'tabActive' : ''}`} onClick={() => setTab('customers')}>Клиенты</div>
          <div className={`tab ${tab === 'pos' ? 'tabActive' : ''}`} onClick={() => setTab('pos')}>Операции</div>
        </div>
      </div>

      {!authReady ? (
        <div className="grid">
          <div className="card cardFull">
            <div className="row">
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Вход</div>
                <div style={{ color: 'rgba(0,0,0,0.55)', fontSize: 13, marginTop: 6 }}>
                  {publicStatus?.admin_auth_configured === false
                    ? 'Админ-доступ не настроен на сервере. Установите переменную ADMIN_SECRET.'
                    : 'Введите ключ администратора для доступа к панели.'}
                </div>
              </div>
              <div className="pill">API: {publicStatus?.api || 'недоступен'}</div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 320px' }}>
                <input className="input" value={adminKey} onChange={e => setAdminKey(e.target.value)} placeholder="Ключ администратора" />
              </div>
              <button className="btn btnPrimary" onClick={() => void doLogin()}>
                Войти
              </button>
              <button className="btn" onClick={() => void loadPublicStatus()}>
                Проверить статус
              </button>
            </div>
            {error ? <div style={{ marginTop: 12, color: '#8b0000', whiteSpace: 'pre-wrap' }}>{error}</div> : null}
          </div>
        </div>
      ) : null}

      {authReady && error ? (
        <div className="grid">
          <div className="card cardFull">
            <div className="pill pillWarn">Сбой</div>
            <div style={{ marginTop: 10, whiteSpace: 'pre-wrap' }}>{error}</div>
          </div>
        </div>
      ) : null}

      {authReady && tab === 'dashboard' ? <DashboardView dash={dash} reload={() => loadDashboard()} /> : null}
      {authReady && tab === 'customers' ? (
        <CustomersView
          q={q}
          setQ={setQ}
          customers={customers}
          select={id => setSelectedId(id)}
          selected={selected}
          details={details}
          search={() => loadCustomers(q)}
          refresh={() => loadCustomers()}
        />
      ) : null}
      {authReady && tab === 'pos' ? (
        <PosView
          refreshCustomers={() => loadCustomers()}
          onSaleDone={async (customerId: number) => {
            await loadDashboard()
            await loadCustomers()
            setSelectedId(customerId)
            setTab('customers')
          }}
        />
      ) : null}

      <div style={{ marginTop: 14, color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>
        Синхронизация с ERP: {publicStatus?.erp_sync_enabled ? 'включена' : 'выключена'}
      </div>
    </div>
  )
}

function DashboardView({ dash, reload }: { dash: Dashboard | null; reload: () => Promise<void> }) {
  return (
    <div className="grid">
      <div className="card">
        <div className="kpiLabel">Продаж за день</div>
        <div className="kpiValue">{dash ? dash.sales_count : '—'}</div>
        <div className="kpiSub">{dash ? dash.today : ''}</div>
      </div>
      <div className="card">
        <div className="kpiLabel">Выручка</div>
        <div className="kpiValue">{dash ? `${money(dash.sales_total)} ₽` : '—'}</div>
        <div className="kpiSub"><span className="pill pillGood">Начислено {dash ? dash.bonus_earned : '—'}</span> <span className="pill pillWarn">Списано {dash ? dash.bonus_used : '—'}</span></div>
      </div>
      <div className="card">
        <div className="kpiLabel">Клиентов</div>
        <div className="kpiValue">{dash ? dash.customers_total : '—'}</div>
        <div className="kpiSub">Всего в системе</div>
      </div>
      <div className="card">
        <div className="kpiLabel">Чистое начисление</div>
        <div className="kpiValue">{dash ? Math.max(0, dash.bonus_earned - dash.bonus_used) : '—'}</div>
        <div className="kpiSub">Итог за день</div>
      </div>

      <div className="card cardFull">
        <div className="row">
          <div>
            <div style={{ fontWeight: 800 }}>Оперативные данные</div>
            <div style={{ color: 'rgba(0,0,0,0.55)', fontSize: 13, marginTop: 6 }}>Обновляйте сводку по мере проведения операций.</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => void reload()}>Обновить</button>
            <a className="btn" href="/api/v1/exports/transactions.csv" target="_blank" rel="noreferrer">Экспорт CSV</a>
          </div>
        </div>
      </div>
    </div>
  )
}

function CustomersView(props: {
  q: string
  setQ: (s: string) => void
  customers: CustomerListItem[]
  select: (id: number) => void
  selected: CustomerListItem | null
  details: CustomerDetails | null
  search: () => Promise<void>
  refresh: () => Promise<void>
}) {
  const { q, setQ, customers, select, selected, details, search, refresh } = props

  return (
    <div className="grid">
      <div className="card cardFull">
        <div className="row">
          <div style={{ width: '100%', maxWidth: 520 }}>
            <input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Поиск по телефону или ФИО" />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btnPrimary" onClick={() => void search()}>Поиск</button>
            <button className="btn" onClick={() => void refresh()}>Сброс</button>
          </div>
        </div>
      </div>

      <div className="card cardWide">
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Список клиентов</div>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Телефон</th>
              <th>ФИО</th>
              <th>Баланс</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.id} style={{ cursor: 'pointer', background: selected?.id === c.id ? 'rgba(0,0,0,0.06)' : 'transparent' }} onClick={() => select(c.id)}>
                <td>{c.id}</td>
                <td>{c.phone || '—'}</td>
                <td>{c.full_name || '—'}</td>
                <td><span className="pill">{c.balance_points}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card cardWide">
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Карточка клиента</div>
        {!details ? (
          <div style={{ color: 'rgba(0,0,0,0.55)' }}>Выберите клиента в списке</div>
        ) : (
          <div>
            <div className="row" style={{ marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900 }}>{details.customer.full_name || 'Без имени'}</div>
                <div style={{ color: 'rgba(0,0,0,0.55)', marginTop: 6 }}>{details.customer.phone || '—'} · QR: {details.customer.qr_token || '—'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="pill pillGood">Баланс {details.customer.balance_points}</div>
                <div style={{ color: 'rgba(0,0,0,0.55)', fontSize: 12, marginTop: 6 }}>Telegram ID: {details.customer.telegram_id || '—'}</div>
              </div>
            </div>

            <div style={{ marginTop: 10, fontWeight: 800 }}>История операций</div>
            <table className="table" style={{ marginTop: 8 }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Дата</th>
                  <th>Сумма</th>
                  <th>Списано</th>
                  <th>Начислено</th>
                  <th>Документ</th>
                </tr>
              </thead>
              <tbody>
                {details.transactions.map(t => (
                  <tr key={t.id}>
                    <td>{t.id}</td>
                    <td>{t.created_at}</td>
                    <td>{money(t.total_amount)} ₽</td>
                    <td>{t.bonus_used}</td>
                    <td>{t.bonus_earned}</td>
                    <td>
                      <a href={Api.receiptUrl(t.id)} target="_blank" rel="noreferrer">Чек (PDF)</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function PosView(props: {
  refreshCustomers: () => Promise<void>
  onSaleDone: (customerId: number) => Promise<void>
}) {
  const { refreshCustomers, onSaleDone } = props

  const [mode, setMode] = useState<'phone' | 'qr' | 'name'>('phone')
  const [input, setInput] = useState('')
  const [found, setFound] = useState<number | null>(null)
  const [items, setItems] = useState<Array<{ code: string; name: string; price: number; qty: number }>>([
    { code: 'COFFEE', name: 'Капучино', price: 240, qty: 1 },
    { code: 'DESSERT', name: 'Чизкейк', price: 190, qty: 1 }
  ])
  const [bonus, setBonus] = useState(50)
  const [busy, setBusy] = useState(false)
  const [info, setInfo] = useState<string | null>(null)

  const total = useMemo(() => items.reduce((a, b) => a + b.price * b.qty, 0), [items])

  async function identify() {
    setInfo(null)
    setFound(null)
    setBusy(true)
    try {
      if (mode === 'phone') {
        const r = await Api.identifyPhone(input)
        setFound(r.customer_id)
      } else if (mode === 'qr') {
        const r = await Api.identifyQr(input)
        setFound(r.customer_id)
      } else {
        const r = await Api.identifyName(input)
        if (r.items.length === 1) {
          setFound(r.items[0].id)
        } else {
          setInfo(`Найдено: ${r.items.length}. Уточните параметры поиска.`)
        }
      }
      await refreshCustomers()
    } catch (e: any) {
      setInfo(String(e?.message || e))
    } finally {
      setBusy(false)
    }
  }

  async function sale() {
    if (!found) return
    setBusy(true)
    setInfo(null)
    try {
      const res = await Api.createSale({ customer_id: found, items, requested_bonus: bonus })
      setInfo(`Операция выполнена. Списано ${res.bonus_used}, начислено ${res.bonus_earned}, баланс ${res.balance}.`)
      await onSaleDone(found)
    } catch (e: any) {
      setInfo(String(e?.message || e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid">
      <div className="card cardFull">
        <div className="row">
          <div style={{ fontWeight: 900, fontSize: 18 }}>Операция продажи</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`btn ${mode === 'phone' ? 'btnPrimary' : ''}`} onClick={() => setMode('phone')}>Телефон</button>
            <button className={`btn ${mode === 'name' ? 'btnPrimary' : ''}`} onClick={() => setMode('name')}>ФИО</button>
            <button className={`btn ${mode === 'qr' ? 'btnPrimary' : ''}`} onClick={() => setMode('qr')}>QR</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px' }}>
            <input className="input" value={input} onChange={e => setInput(e.target.value)} placeholder={mode === 'phone' ? '+79991234567' : mode === 'qr' ? 'QR токен' : 'Иванов Иван'} />
          </div>
          <button className="btn btnPrimary" disabled={busy} onClick={() => void identify()}>
            Идентифицировать
          </button>
          <div className="pill">Клиент: {found || '—'}</div>
        </div>
        {info ? <div style={{ marginTop: 10, color: 'rgba(0,0,0,0.65)' }}>{info}</div> : null}
      </div>

      <div className="card cardWide">
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Состав</div>
        <table className="table">
          <thead>
            <tr>
              <th>Код</th>
              <th>Наименование</th>
              <th>Цена</th>
              <th>Кол-во</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx}>
                <td>{it.code}</td>
                <td>{it.name}</td>
                <td>{money(it.price)} ₽</td>
                <td>
                  <input
                    className="input"
                    style={{ width: 90, padding: '8px 10px' }}
                    value={it.qty}
                    onChange={e => {
                      const v = Math.max(1, Number(e.target.value || 1))
                      setItems(prev => prev.map((p, i) => (i === idx ? { ...p, qty: v } : p)))
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card cardWide">
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Лояльность</div>
        <div className="row" style={{ marginBottom: 10 }}>
          <div className="pill">Сумма {money(total)} ₽</div>
          <div className="pill pillWarn">Списание {bonus}</div>
        </div>
        <input className="input" value={bonus} onChange={e => setBonus(Math.max(0, Number(e.target.value || 0)))} />
        <button className="btn btnPrimary" style={{ marginTop: 12, width: '100%' }} disabled={!found || busy} onClick={() => void sale()}>
          Провести
        </button>
        <div style={{ marginTop: 10, color: 'rgba(0,0,0,0.55)', fontSize: 12 }}>
          Чек сохраняется в PDF. При наличии Telegram ID отправляется уведомление.
        </div>
      </div>
    </div>
  )
}

export default App
