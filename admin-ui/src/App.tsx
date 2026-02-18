import React, { useEffect, useMemo, useState } from 'react'
import { Api, CustomerDetails, CustomerListItem, Dashboard, Integration, IntegrationDelivery, IntegrationTemplate, getAdminSecret, setAdminSecret } from './api'

type Tab = 'dashboard' | 'customers' | 'pos' | 'integrations' | 'settings'

type PublicStatus = {
  api: string
  admin_auth_configured: boolean
  erp_sync_enabled: boolean
}

type AuthStatus = {
  bootstrap_enabled: boolean
  default_admin_present: boolean
  default_admin_username: string
  must_change_password: boolean
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
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null)
  const [loginMode, setLoginMode] = useState<'password' | 'key' | 'recover'>('password')
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [recoverySecret, setRecoverySecret] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [adminKey, setAdminKey] = useState(getAdminSecret())
  const [authReady, setAuthReady] = useState(false)
  const [mustChangePassword, setMustChangePassword] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [settingsNewPassword, setSettingsNewPassword] = useState('')
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [integrationTemplates, setIntegrationTemplates] = useState<IntegrationTemplate[]>([])
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<number | null>(null)
  const [integrationDeliveries, setIntegrationDeliveries] = useState<IntegrationDelivery[]>([])
  const [integrationsBusy, setIntegrationsBusy] = useState(false)

  const selected = useMemo(() => customers.find(c => c.id === selectedId) || null, [customers, selectedId])
  const selectedIntegration = useMemo(
    () => integrations.find(i => i.id === selectedIntegrationId) || null,
    [integrations, selectedIntegrationId]
  )

  async function loadPublicStatus() {
    try {
      const s = await Api.publicStatus()
      setPublicStatus(s)
    } catch {
      setPublicStatus(null)
    }
  }

  async function loadAuthStatus() {
    try {
      const s = await Api.authStatus()
      setAuthStatus(s)
      if (!username.trim() && s.default_admin_username) {
        setUsername(s.default_admin_username)
      }
    } catch {
      setAuthStatus(null)
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

  async function loadIntegrations() {
    setError(null)
    setIntegrationsBusy(true)
    try {
      const res = await Api.integrations()
      setIntegrations(res.items)
    } finally {
      setIntegrationsBusy(false)
    }
  }

  async function loadDeliveries(id: number) {
    setError(null)
    const res = await Api.integrationDeliveries(id)
    setIntegrationDeliveries(res.items)
  }

  async function loadIntegrationTemplates() {
    setError(null)
    const res = await Api.integrationTemplates()
    setIntegrationTemplates(res.items)
  }

  async function bootstrap() {
    setError(null)
    await loadPublicStatus()
    await loadAuthStatus()
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
        setError('Доступ запрещён. Проверьте ключ или выполните вход по паролю.')
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

  useEffect(() => {
    if (!authReady) return
    if (tab === 'integrations') {
      Promise.all([loadIntegrations(), loadIntegrationTemplates()]).catch(e => setError(String(e)))
    }
  }, [tab, authReady])

  useEffect(() => {
    if (!authReady) return
    if (selectedIntegrationId != null) {
      loadDeliveries(selectedIntegrationId).catch(e => setError(String(e)))
    }
  }, [selectedIntegrationId, authReady])

  async function doLoginByKey() {
    setError(null)
    setMustChangePassword(false)
    setAdminSecret(adminKey.trim())
    await bootstrap()
  }

  async function doLoginByPassword() {
    setError(null)
    try {
      const res = await Api.login(username.trim(), password)
      setMustChangePassword(Boolean(res.must_change_password))
      setAdminSecret(res.token)
      setAdminKey(res.token)
      setPassword('')
      await bootstrap()
      if (res.must_change_password) {
        setTab('settings')
      }
    } catch (e: any) {
      setError(String(e?.message || e))
    }
  }

  async function doRecoverPassword() {
    setError(null)
    try {
      await Api.recoverPassword(username.trim(), newPassword, recoverySecret)
      setRecoverySecret('')
      setNewPassword('')
      setPassword('')
      setLoginMode('password')
      setError('Пароль восстановлен. Выполните вход.')
    } catch (e: any) {
      setError(String(e?.message || e))
    }
  }

  async function doChangePassword() {
    setError(null)
    try {
      await Api.changePassword(oldPassword, settingsNewPassword)
      setOldPassword('')
      setSettingsNewPassword('')
      setAdminSecret('')
      setAdminKey('')
      setAuthReady(false)
      setMustChangePassword(false)
      setTab('dashboard')
      setError('Пароль изменён. Выполните вход заново.')
    } catch (e: any) {
      setError(String(e?.message || e))
    }
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
          <div className={`tab ${tab === 'integrations' ? 'tabActive' : ''}`} onClick={() => setTab('integrations')}>Интеграции</div>
          <div className={`tab ${tab === 'settings' ? 'tabActive' : ''}`} onClick={() => setTab('settings')}>Настройки</div>
        </div>
      </div>

      {!authReady ? (
        <div className="grid">
          <div className="card cardFull">
            <div className="row">
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Вход</div>
                <div style={{ color: 'rgba(0,0,0,0.55)', fontSize: 13, marginTop: 6 }}>
                  Используйте вход по паролю или по ключу x-admin-secret.
                </div>
              </div>
              <div className="pill">API: {publicStatus?.api || 'недоступен'}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <button className={`btn ${loginMode === 'password' ? 'btnPrimary' : ''}`} onClick={() => setLoginMode('password')}>По паролю</button>
              <button className={`btn ${loginMode === 'key' ? 'btnPrimary' : ''}`} onClick={() => setLoginMode('key')}>По ключу</button>
              <button className={`btn ${loginMode === 'recover' ? 'btnPrimary' : ''}`} onClick={() => setLoginMode('recover')}>Восстановление</button>
              <button className="btn" onClick={() => void loadPublicStatus()}>Статус API</button>
            </div>

            {loginMode === 'password' ? (
              <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                <div className="row">
                  <div style={{ flex: 1 }}>
                    <input className="input" value={username} onChange={e => setUsername(e.target.value)} placeholder="Логин" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <input className="input" value={password} onChange={e => setPassword(e.target.value)} placeholder="Пароль" type="password" />
                  </div>
                  <button className="btn btnPrimary" onClick={() => void doLoginByPassword()} disabled={!username.trim() || !password}>
                    Войти
                  </button>
                </div>
                <div style={{ color: 'rgba(0,0,0,0.55)', fontSize: 12 }}>
                  {authStatus?.default_admin_present
                    ? `Дефолтный админ: ${authStatus.default_admin_username}`
                    : 'Дефолтный админ не создан. Проверьте ADMIN_BOOTSTRAP_DEFAULT.'}
                </div>
              </div>
            ) : null}

            {loginMode === 'key' ? (
              <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 320px' }}>
                  <input className="input" value={adminKey} onChange={e => setAdminKey(e.target.value)} placeholder="x-admin-secret" />
                </div>
                <button className="btn btnPrimary" onClick={() => void doLoginByKey()} disabled={!adminKey.trim()}>
                  Войти
                </button>
              </div>
            ) : null}

            {loginMode === 'recover' ? (
              <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                <div className="row">
                  <div style={{ flex: 1 }}>
                    <input className="input" value={username} onChange={e => setUsername(e.target.value)} placeholder="Логин" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <input className="input" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Новый пароль" type="password" />
                  </div>
                </div>
                <div className="row">
                  <div style={{ flex: 1 }}>
                    <input className="input" value={recoverySecret} onChange={e => setRecoverySecret(e.target.value)} placeholder="Код восстановления (ADMIN_RECOVERY_SECRET)" type="password" />
                  </div>
                  <button className="btn btnPrimary" onClick={() => void doRecoverPassword()} disabled={!username.trim() || newPassword.length < 8 || !recoverySecret}>
                    Сбросить пароль
                  </button>
                </div>
              </div>
            ) : null}

            {mustChangePassword ? (
              <div style={{ marginTop: 12, color: '#8b0000' }}>
                Требуется смена пароля. Откройте вкладку «Настройки».
              </div>
            ) : null}
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
      {authReady && tab === 'integrations' ? (
        <IntegrationsView
          items={integrations}
          templates={integrationTemplates}
          busy={integrationsBusy}
          selected={selectedIntegration}
          deliveries={integrationDeliveries}
          select={id => setSelectedIntegrationId(id)}
          reload={() => loadIntegrations()}
          create={async p => {
            await Api.createIntegration(p)
            await loadIntegrations()
          }}
          update={async (id, p) => {
            await Api.updateIntegration(id, p)
            await loadIntegrations()
          }}
          rotate={async id => {
            await Api.rotateIntegrationSecret(id)
            await loadIntegrations()
            setSelectedIntegrationId(id)
          }}
          remove={async id => {
            await Api.deleteIntegration(id)
            setSelectedIntegrationId(null)
            await loadIntegrations()
          }}
          refreshDeliveries={async id => {
            await loadDeliveries(id)
          }}
        />
      ) : null}
      {authReady && tab === 'settings' ? (
        <div className="grid">
          <div className="card cardFull">
            <div className="row">
              <div>
                <div style={{ fontWeight: 900, fontSize: 18 }}>Настройки доступа</div>
                <div style={{ color: 'rgba(0,0,0,0.55)', fontSize: 13, marginTop: 6 }}>
                  {mustChangePassword ? 'Требуется смена пароля. После смены потребуется вход заново.' : 'Смена пароля администратора.'}
                </div>
              </div>
              <div className="pill">Сессия: x-admin-secret</div>
            </div>

            <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
              <div className="row">
                <div style={{ flex: 1 }}>
                  <input className="input" value={oldPassword} onChange={e => setOldPassword(e.target.value)} placeholder="Текущий пароль" type="password" />
                </div>
                <div style={{ flex: 1 }}>
                  <input className="input" value={settingsNewPassword} onChange={e => setSettingsNewPassword(e.target.value)} placeholder="Новый пароль (мин. 8 символов)" type="password" />
                </div>
                <button className="btn btnPrimary" onClick={() => void doChangePassword()} disabled={!oldPassword || settingsNewPassword.length < 8}>
                  Сменить пароль
                </button>
              </div>
              <div style={{ color: 'rgba(0,0,0,0.55)', fontSize: 12 }}>
                Восстановление выполняется через endpoint /api/v1/public/auth/recover с заголовком x-admin-recovery (значение ADMIN_RECOVERY_SECRET).
              </div>
            </div>
          </div>
        </div>
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

function IntegrationsView(props: {
  items: Integration[]
  templates: IntegrationTemplate[]
  busy: boolean
  selected: Integration | null
  deliveries: IntegrationDelivery[]
  select: (id: number) => void
  reload: () => Promise<void>
  create: (p: { name: string; kind: string; enabled: boolean; config: any }) => Promise<void>
  update: (id: number, p: { name: string; kind: string; enabled: boolean; config: any }) => Promise<void>
  rotate: (id: number) => Promise<void>
  remove: (id: number) => Promise<void>
  refreshDeliveries: (id: number) => Promise<void>
}) {
  const { items, templates, busy, selected, deliveries, select, reload, create, update, rotate, remove, refreshDeliveries } = props

  const [mode, setMode] = useState<'create' | 'edit'>('create')
  const [templateId, setTemplateId] = useState('')
  const [name, setName] = useState('')
  const [kind, setKind] = useState('pos_webhook')
  const [enabled, setEnabled] = useState(true)
  const [configText, setConfigText] = useState('{}')
  const [info, setInfo] = useState<string | null>(null)

  useEffect(() => {
    if (!selected) return
    setMode('edit')
    setTemplateId('')
    setName(selected.name)
    setKind(selected.kind)
    setEnabled(selected.enabled)
    setConfigText(JSON.stringify(selected.config || {}, null, 2))
  }, [selected?.id])

  useEffect(() => {
    if (!templateId) return
    const t = templates.find(x => x.id === templateId)
    if (!t) return
    setMode('create')
    setName(t.name)
    setKind(t.kind)
    setEnabled(true)
    setConfigText(JSON.stringify(t.config || {}, null, 2))
  }, [templateId])

  function parseConfig(): any {
    const t = (configText || '').trim()
    if (!t) return {}
    return JSON.parse(t)
  }

  async function onSave() {
    setInfo(null)
    try {
      const cfg = parseConfig()
      if (mode === 'create') {
        await create({ name: name.trim(), kind: kind.trim(), enabled, config: cfg })
        setName('')
        setKind('pos_webhook')
        setEnabled(true)
        setConfigText('{}')
        setInfo('Интеграция создана.')
      } else if (mode === 'edit' && selected) {
        await update(selected.id, { name: name.trim(), kind: kind.trim(), enabled, config: cfg })
        setInfo('Изменения сохранены.')
      }
    } catch (e: any) {
      setInfo(String(e?.message || e))
    }
  }

  const webhookUrl = selected ? `${location.origin}/api/v1/public/integrations/${selected.id}/pos/receipt` : ''

  return (
    <div className="grid">
      <div className="card cardWide">
        <div className="row" style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 800 }}>Подключения</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" disabled={busy} onClick={() => void reload()}>Обновить</button>
          </div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Наименование</th>
              <th>Тип</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {items.map(i => (
              <tr key={i.id} style={{ cursor: 'pointer', background: selected?.id === i.id ? 'rgba(0,0,0,0.04)' : 'transparent' }} onClick={() => select(i.id)}>
                <td>{i.id}</td>
                <td>{i.name}</td>
                <td>{i.kind}</td>
                <td><span className={`pill ${i.enabled ? 'pillGood' : 'pillWarn'}`}>{i.enabled ? 'Активна' : 'Отключена'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 10, color: 'rgba(0,0,0,0.55)', fontSize: 12 }}>
          Типы: pos_webhook (входящий чек), outbound_webhook (исходящие события).
        </div>
      </div>

      <div className="card cardWide">
        <div className="row" style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 800 }}>{mode === 'create' ? 'Создание' : 'Настройки'}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`btn ${mode === 'create' ? 'btnPrimary' : ''}`} onClick={() => setMode('create')}>Новая</button>
            <button className={`btn ${mode === 'edit' ? 'btnPrimary' : ''}`} disabled={!selected} onClick={() => setMode('edit')}>Редактирование</button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          {mode === 'create' ? (
            <div>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', marginBottom: 6 }}>Шаблон</div>
              <select className="input" value={templateId} onChange={e => setTemplateId(e.target.value)}>
                <option value="">Без шаблона</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.region} · {t.name}
                  </option>
                ))}
              </select>
              <div style={{ color: 'rgba(0,0,0,0.55)', fontSize: 12, marginTop: 6 }}>
                {templateId ? templates.find(t => t.id === templateId)?.description : 'Выберите типовой сценарий для быстрых настроек.'}
              </div>
            </div>
          ) : null}
          <div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', marginBottom: 6 }}>Наименование</div>
            <input className="input" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="row">
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', marginBottom: 6 }}>Тип</div>
              <input className="input" value={kind} onChange={e => setKind(e.target.value)} />
            </div>
            <div style={{ width: 180 }}>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', marginBottom: 6 }}>Статус</div>
              <button className={`btn ${enabled ? 'btnPrimary' : ''}`} onClick={() => setEnabled(v => !v)}>{enabled ? 'Активна' : 'Отключена'}</button>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', marginBottom: 6 }}>Конфигурация (JSON)</div>
            <textarea className="input" style={{ height: 160, resize: 'vertical' }} value={configText} onChange={e => setConfigText(e.target.value)} />
          </div>

          <div className="row">
            <button className="btn btnPrimary" onClick={() => void onSave()} disabled={!name.trim() || !kind.trim()}>
              Сохранить
            </button>
            {mode === 'edit' && selected ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" onClick={() => void rotate(selected.id)}>Сменить ключ</button>
                <button className="btn" onClick={() => void remove(selected.id)}>Удалить</button>
              </div>
            ) : (
              <div />
            )}
          </div>

          {info ? <div style={{ color: info.toLowerCase().includes('error') ? '#8b0000' : 'rgba(0,0,0,0.75)' }}>{info}</div> : null}

          {selected && selected.kind === 'pos_webhook' ? (
            <div>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', marginBottom: 6 }}>Webhook URL (приём чека)</div>
              <input className="input" readOnly value={webhookUrl} />
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', marginTop: 8 }}>
                Заголовок авторизации: x-integration-secret
              </div>
              <input className="input" readOnly value={selected.secret} style={{ marginTop: 6 }} />
            </div>
          ) : null}
        </div>
      </div>

      {selected ? (
        <div className="card cardFull">
          <div className="row">
            <div style={{ fontWeight: 800 }}>Доставка событий</div>
            <button className="btn" onClick={() => void refreshDeliveries(selected.id)}>Обновить</button>
          </div>
          <table className="table" style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Событие</th>
                <th>Статус</th>
                <th>HTTP</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map(d => (
                <tr key={d.id}>
                  <td>{d.id}</td>
                  <td>{d.event_type}</td>
                  <td><span className={`pill ${d.status === 'ok' ? 'pillGood' : 'pillWarn'}`}>{d.status}</span></td>
                  <td>{d.http_status ?? '—'}</td>
                  <td>{d.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 10, color: 'rgba(0,0,0,0.55)', fontSize: 12 }}>
            Для outbound_webhook укажите config.url и (опционально) config.headers.
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
