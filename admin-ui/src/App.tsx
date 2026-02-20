import React, { useEffect, useMemo, useRef, useState } from 'react'
import { MarketingView } from './MarketingView'
import { AdminMe, Api, CustomerDetails, CustomerListItem, Dashboard, Integration, IntegrationDelivery, IntegrationTemplate, RolePermissions, getAdminSecret, setAdminSecret } from './api'

type Tab = 'dashboard' | 'customers' | 'pos' | 'integrations' | 'products' | 'settings' | 'marketing'

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

type NoticeLevel = 'ok' | 'warn' | 'err'
type Notice = { level: NoticeLevel; message: string; visible: boolean }

type AuthFlow = {
  active: boolean
  step: number
  percent: number
  label: string
  steps: Array<{ label: string; done: boolean }>
}

function roleLabel(role: string) {
  const r = String(role || '').toLowerCase()
  if (r === 'owner') return 'Админ'
  if (r === 'operator') return 'Оператор'
  if (r === 'marketer') return 'Менеджер'
  return r || '—'
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
  const [notice, setNotice] = useState<Notice | null>(null)
  const [authFlow, setAuthFlow] = useState<AuthFlow | null>(null)
  const authAbortRef = useRef<AbortController | null>(null)
  const authWorkerRef = useRef<Worker | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showSettingsOld, setShowSettingsOld] = useState(false)
  const [showSettingsNew, setShowSettingsNew] = useState(false)

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
  const [me, setMe] = useState<AdminMe | null>(null)
  const [products, setProducts] = useState<Array<{ id: number; code: string; name: string; kind: string; price: number; active: boolean }>>([])

  console.log(`[App] Render. LoginMode=${loginMode} Username=${username} PasswordLen=${password.length} Notice=${notice ? JSON.stringify(notice) : 'null'}`)

  const selected = useMemo(() => customers.find(c => c.id === selectedId) || null, [customers, selectedId])
  const selectedIntegration = useMemo(
    () => integrations.find(i => i.id === selectedIntegrationId) || null,
    [integrations, selectedIntegrationId]
  )

  function clipMessage(s: string) {
    const t = String(s || '').replace(/\s+/g, ' ').trim()
    return t.length > 80 ? `${t.slice(0, 77)}...` : t
  }

  function showNotice(level: NoticeLevel, message: string) {
    console.log(`[App] showNotice: ${level} - ${message}`)
    const m = clipMessage(message)
    setNotice({ level, message: m, visible: true })
    window.setTimeout(() => setNotice(prev => (prev ? { ...prev, visible: false } : prev)), 3500)
  }

  function stopAuthFlow() {
    console.log('[App] stopAuthFlow called')
    authAbortRef.current?.abort()
    authAbortRef.current = null
    authWorkerRef.current?.postMessage({ type: 'stop' })
    authWorkerRef.current?.terminate()
    authWorkerRef.current = null
    setAuthFlow(null)
  }

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

  async function loadProducts() {
    setError(null)
    const res = await Api.products()
    setProducts(res.items)
  }

  async function bootstrap() {
    setError(null)
    await loadPublicStatus()
    await loadAuthStatus()
    try {
      await Promise.all([loadDashboard(), loadCustomers(), loadProducts()])
      try {
        const m = await Api.me()
        setMe(m)
      } catch {
        setMe(null)
      }
      setAuthReady(true)
    } catch (e: any) {
      const msg = String(e?.message || e)
      if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
        setAuthReady(false)
        return
      }
      showNotice('err', msg)
      setAuthReady(false)
    }
  }

  useEffect(() => {
    bootstrap()
  }, [])

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        setPassword('')
        setNewPassword('')
        setRecoverySecret('')
        setOldPassword('')
        setSettingsNewPassword('')
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
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

  function startAuthFlowSteps(labels: string[]) {
    stopAuthFlow()
    const ctrl = new AbortController()
    authAbortRef.current = ctrl
    const steps = labels.map(label => ({ label, done: false }))
    setAuthFlow({ active: true, step: 0, percent: 0, label: steps[0]?.label || '', steps })
    const w = new Worker(new URL('./authWorker.ts', import.meta.url), { type: 'module' })
    authWorkerRef.current = w
    w.onmessage = e => {
      const m = e.data as any
      if (m?.type === 'progress') {
        setAuthFlow(prev => (prev ? { ...prev, step: m.step, percent: m.percent, label: m.label } : prev))
      }
    }
    w.postMessage({ type: 'start', steps: labels.map(label => ({ label })) })
    return ctrl.signal
  }

  function markAuthStepDone(stepIndex: number) {
    authWorkerRef.current?.postMessage({ type: 'completeStep', step: stepIndex })
    setAuthFlow(prev => {
      if (!prev) return prev
      const next = prev.steps.map((s, i) => (i === stepIndex ? { ...s, done: true } : s))
      return { ...prev, steps: next }
    })
  }

  function setAuthStep(stepIndex: number, label: string) {
    authWorkerRef.current?.postMessage({ type: 'setStep', step: stepIndex, label })
    setAuthFlow(prev => (prev ? { ...prev, step: stepIndex, label } : prev))
  }

  async function doLoginByKey() {
    setError(null)
    try {
      const signal = startAuthFlowSteps(['Подключение к серверу', 'Проверка ключа', 'Создание сессии'])
      setAuthStep(0, 'Подключение к серверу...')
      await Api.publicStatus(signal)
      markAuthStepDone(0)

      setAuthStep(1, 'Проверка ключа...')
      setMustChangePassword(false)
      setAdminSecret(adminKey.trim())
      markAuthStepDone(1)

      setAuthStep(2, 'Создание сессии...')
      await bootstrap()
      markAuthStepDone(2)
      showNotice('ok', 'Вход выполнен.')
      stopAuthFlow()
    } catch (e: any) {
      console.log(`[App] Login failed: ${e?.message || e}`)
      if (String(e?.name || '').toLowerCase().includes('abort')) {
        showNotice('warn', 'Вход отменён.')
      } else {
        showNotice('err', String(e?.message || e))
      }
      stopAuthFlow()
    }
  }

  async function doLoginByPassword() {
    console.log('[App] doLoginByPassword started')
    setError(null)
    try {
      const signal = startAuthFlowSteps(['Подключение к серверу', 'Проверка учетных данных', 'Создание сессии'])
      setAuthStep(0, 'Подключение к серверу...')
      await Promise.all([Api.publicStatus(signal), Api.authStatus(signal)])
      markAuthStepDone(0)

      setAuthStep(1, 'Проверка учетных данных...')
      const res = await Api.login(username.trim(), password, signal)
      setMustChangePassword(Boolean(res.must_change_password))
      setPassword('')
      markAuthStepDone(1)

      setAuthStep(2, 'Создание сессии...')
      await bootstrap()
      markAuthStepDone(2)
      if (res.must_change_password) {
        setTab('settings')
      }
      showNotice('ok', 'Вход выполнен.')
      stopAuthFlow()
    } catch (e: any) {
      console.error(`[App] Login failed (catch):`, e)
      console.error(`[App] Login failed message:`, e.message)
      if (String(e?.name || '').toLowerCase().includes('abort')) {
        showNotice('warn', 'Вход отменён.')
      } else {
        showNotice('err', String(e?.message || e))
      }
      stopAuthFlow()
    }
  }

  async function doRecoverPassword() {
    setError(null)
    try {
      const signal = startAuthFlowSteps(['Подключение к серверу', 'Проверка данных', 'Сброс пароля'])
      setAuthStep(0, 'Подключение к серверу...')
      await Promise.all([Api.publicStatus(signal), Api.authStatus(signal)])
      markAuthStepDone(0)

      setAuthStep(1, 'Проверка данных...')
      markAuthStepDone(1)

      setAuthStep(2, 'Сброс пароля...')
      await Api.recoverPassword(username.trim(), newPassword, recoverySecret, signal)
      markAuthStepDone(2)
      setRecoverySecret('')
      setNewPassword('')
      setPassword('')
      setLoginMode('password')
      showNotice('ok', 'Пароль восстановлен. Выполните вход.')
      stopAuthFlow()
    } catch (e: any) {
      if (String(e?.name || '').toLowerCase().includes('abort')) {
        showNotice('warn', 'Операция отменена.')
      } else {
        showNotice('err', String(e?.message || e))
      }
      stopAuthFlow()
    }
  }

  async function doChangePassword() {
    setError(null)
    try {
      const signal = startAuthFlowSteps(['Проверка учетных данных', 'Обновление пароля', 'Завершение'])
      setAuthStep(0, 'Проверка учетных данных...')
      markAuthStepDone(0)

      setAuthStep(1, 'Обновление пароля...')
      await Api.changePassword(oldPassword, settingsNewPassword, signal)
      markAuthStepDone(1)

      setAuthStep(2, 'Завершение...')
      setOldPassword('')
      setSettingsNewPassword('')
      setAdminSecret('')
      setAdminKey('')
      setAuthReady(false)
      setMustChangePassword(false)
      setTab('dashboard')
      markAuthStepDone(2)
      showNotice('ok', 'Пароль изменён. Войдите заново.')
      stopAuthFlow()
    } catch (e: any) {
      if (String(e?.name || '').toLowerCase().includes('abort')) {
        showNotice('warn', 'Операция отменена.')
      } else {
        showNotice('err', String(e?.message || e))
      }
      stopAuthFlow()
    }
  }

  async function doLogout() {
    setError(null)
    try {
      await Api.logout()
    } catch {
    } finally {
      setAdminSecret('')
      setAdminKey('')
      setAuthReady(false)
      setMustChangePassword(false)
      setMe(null)
      setTab('dashboard')
      showNotice('ok', 'Вы вышли из системы.')
    }
  }

  const allowedTabs: Tab[] = useMemo(() => {
    if (!authReady) return ['dashboard', 'customers', 'pos', 'integrations', 'products', 'settings']
    const role = String(me?.role || '').toLowerCase()
    if (role === 'owner') return ['dashboard', 'customers', 'pos', 'integrations', 'products', 'settings']

    const perms = new Set(me?.permissions || [])
    // If user has '*' permission, they see everything (though owner check above covers this usually)
    if (perms.has('*')) return ['dashboard', 'customers', 'pos', 'integrations', 'products', 'settings']

    const tabs: Tab[] = []
    if (perms.has('dashboard.read')) tabs.push('dashboard')
    if (perms.has('customer.list') || perms.has('customer.read')) tabs.push('customers')
    if (perms.has('pos.sale')) tabs.push('pos')
    if (perms.has('integration.read')) tabs.push('integrations')
    if (perms.has('product.read')) tabs.push('products')
    // Settings is always available for password change, but content inside depends on permissions
    tabs.push('settings')

    return tabs
  }, [authReady, me?.role, me?.permissions])

  const safeTab: Tab = useMemo(() => {
    if (!authReady) return tab
    return allowedTabs.includes(tab) ? tab : allowedTabs[0] || 'dashboard'
  }, [tab, authReady, allowedTabs])

  useEffect(() => {
    if (!authReady) return
    if (tab !== safeTab) setTab(safeTab)
  }, [safeTab, tab, authReady])

  return (
    <div className="container">
      <div className="header">
        <div className="brand">
          <div style={{ fontWeight: 800 }}>Панель управления</div>
        </div>
        <div className="tabs">
          {allowedTabs.includes('dashboard') ? (
            <div className={`tab ${safeTab === 'dashboard' ? 'tabActive' : ''}`} onClick={() => setTab('dashboard')}>Сводка</div>
          ) : null}
          {allowedTabs.includes('customers') ? (
            <div className={`tab ${safeTab === 'customers' ? 'tabActive' : ''}`} onClick={() => setTab('customers')}>Клиенты</div>
          ) : null}
          {allowedTabs.includes('pos') ? (
            <div className={`tab ${safeTab === 'pos' ? 'tabActive' : ''}`} onClick={() => setTab('pos')}>Операции</div>
          ) : null}
          {allowedTabs.includes('integrations') ? (
            <div className={`tab ${safeTab === 'integrations' ? 'tabActive' : ''}`} onClick={() => setTab('integrations')}>Интеграции</div>
          ) : null}
          {allowedTabs.includes('products') ? (
            <div className={`tab ${safeTab === 'products' ? 'tabActive' : ''}`} onClick={() => setTab('products')}>Товары</div>
          ) : null}
          {allowedTabs.includes('settings') ? (
            <div className={`tab ${safeTab === 'settings' ? 'tabActive' : ''}`} onClick={() => setTab('settings')}>Настройки</div>
          ) : null}
        </div>
        {authReady ? <div className="pill">Роль: {roleLabel(me?.role || '')}</div> : null}
      </div>

      {notice ? (
        <div className="grid">
          <StatusBar notice={notice} />
        </div>
      ) : null}

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
                    <input className="input" value={username} onChange={e => setUsername(e.target.value)} placeholder="Логин" autoComplete="off" spellCheck={false} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        className="input"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Пароль"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="off"
                        spellCheck={false}
                      />
                      <button className="btn" onClick={() => setShowPassword(v => !v)} aria-label="Показать пароль" type="button">
                        {showPassword ? 'Скрыть' : 'Показать'}
                      </button>
                    </div>
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
                  <input className="input" value={adminKey} onChange={e => setAdminKey(e.target.value)} placeholder="x-admin-secret" autoComplete="off" spellCheck={false} />
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
                    <input className="input" value={username} onChange={e => setUsername(e.target.value)} placeholder="Логин" autoComplete="off" spellCheck={false} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        className="input"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Новый пароль"
                        type={showNewPassword ? 'text' : 'password'}
                        autoComplete="off"
                        spellCheck={false}
                      />
                      <button className="btn" onClick={() => setShowNewPassword(v => !v)} aria-label="Показать пароль" type="button">
                        {showNewPassword ? 'Скрыть' : 'Показать'}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="row">
                  <div style={{ flex: 1 }}>
                    <input
                      className="input"
                      value={recoverySecret}
                      onChange={e => setRecoverySecret(e.target.value)}
                      placeholder="Код восстановления"
                      type="password"
                      autoComplete="off"
                      spellCheck={false}
                    />
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
          </div>
        </div>
      ) : null}

      {authReady && safeTab === 'dashboard' ? <DashboardView dash={dash} reload={() => loadDashboard()} /> : null}
      {authReady && safeTab === 'customers' ? (
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
      {authReady && safeTab === 'pos' ? (
        <PosView
          refreshCustomers={() => loadCustomers()}
          products={products}
          reloadProducts={() => loadProducts()}
          onSaleDone={async (customerId: number) => {
            await loadDashboard()
            await loadCustomers()
            setSelectedId(customerId)
            setTab('customers')
          }}
        />
      ) : null}
      {authReady && safeTab === 'integrations' ? (
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
      {authReady && safeTab === 'products' ? (
        <ProductsView
          items={products}
          reload={() => loadProducts()}
          canEdit={(me?.permissions || []).includes('product.create')}
          create={async p => {
            await Api.createProduct(p)
            await loadProducts()
          }}
        />
      ) : null}
      {authReady && safeTab === 'settings' ? (
        <div className="grid">
          <div className="card cardFull">
            <div className="row">
              <div>
                <div style={{ fontWeight: 900, fontSize: 18 }}>Настройки доступа</div>
                <div style={{ color: 'rgba(0,0,0,0.55)', fontSize: 13, marginTop: 6 }}>
                  {mustChangePassword ? 'Требуется смена пароля. После смены потребуется вход заново.' : 'Смена пароля администратора.'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div className="pill">Сессия активна</div>
                <button className="btn" onClick={() => void doLogout()} type="button">
                  Выйти
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
              <div className="row">
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="input"
                      value={oldPassword}
                      onChange={e => setOldPassword(e.target.value)}
                      placeholder="Текущий пароль"
                      type={showSettingsOld ? 'text' : 'password'}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button className="btn" onClick={() => setShowSettingsOld(v => !v)} type="button">
                      {showSettingsOld ? 'Скрыть' : 'Показать'}
                    </button>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="input"
                      value={settingsNewPassword}
                      onChange={e => setSettingsNewPassword(e.target.value)}
                      placeholder="Новый пароль (мин. 8 символов)"
                      type={showSettingsNew ? 'text' : 'password'}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button className="btn" onClick={() => setShowSettingsNew(v => !v)} type="button">
                      {showSettingsNew ? 'Скрыть' : 'Показать'}
                    </button>
                  </div>
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
          
          {me?.role === 'owner' || (me?.permissions || []).includes('settings.access') ? <PermissionsTable /> : null}
        </div>
      ) : null}

      {authFlow?.active ? (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="overlayPanel">
            <div className="row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="spinner" />
                <div style={{ fontWeight: 800 }}>Авторизация</div>
              </div>
              <button className="btn" onClick={() => stopAuthFlow()} type="button">
                Отменить
              </button>
            </div>
            <div style={{ marginTop: 10, color: 'rgba(0,0,0,0.65)', fontSize: 13 }}>{authFlow.label}</div>
            <div style={{ marginTop: 10 }} className="progress" aria-label="progress">
              <div className="progressFill" style={{ width: `${Math.max(0, Math.min(100, authFlow.percent))}%` }} />
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>{Math.max(0, Math.min(100, authFlow.percent))}%</div>
            <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
              {authFlow.steps.map((s, idx) => (
                <div key={idx} className="row" style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`pill ${s.done ? 'pillGood' : 'pillWarn'}`}>{s.done ? 'Готово' : '...'}</span>
                    <span>{s.label}</span>
                  </div>
                  <span>{s.done ? '100%' : idx === authFlow.step ? `${Math.max(0, Math.min(100, authFlow.percent))}%` : '0%'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      <div className="footerVersion">
        v{__APP_VERSION__}
        {__BUILD_ID__ ? ` · ${String(__BUILD_ID__).slice(0, 10)}` : ''}
      </div>
    </div>
  )
}

function StatusBar({ notice }: { notice: Notice }) {
  useEffect(() => {
    console.log('[App] StatusBar MOUNTED')
    return () => console.log('[App] StatusBar UNMOUNTED')
  }, [])
  console.log(`[App] StatusBar render: visible=${notice.visible} level=${notice.level} msg=${notice.message}`)
  const cls =
    notice.level === 'ok' ? 'statusBar statusBarOk' : notice.level === 'warn' ? 'statusBar statusBarWarn' : 'statusBar statusBarErr'
  const icon = notice.level === 'ok' ? '✓' : notice.level === 'warn' ? '!' : '×'
  return (
    <div className={`${cls} ${notice.visible ? 'statusBarVisible' : ''}`} role="status" aria-live="polite" data-testid="status-bar">
      <div className="statusBarIcon">{icon}</div>
      <div className="statusBarText">{notice.message}</div>
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

function ProductsView(props: {
  items: Array<{ id: number; code: string; name: string; kind: string; price: number; active: boolean }>
  reload: () => Promise<void>
  canEdit: boolean
  create: (p: { code: string; name: string; kind: string; price: number; active: boolean }) => Promise<void>
}) {
  const { items, reload, canEdit, create } = props
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [kind, setKind] = useState('goods')
  const [price, setPrice] = useState(0)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onCreate() {
    setBusy(true)
    setInfo(null)
    try {
      await create({ code: code.trim(), name: name.trim(), kind: kind.trim(), price: Math.max(0, Number(price || 0)), active: true })
      setCode('')
      setName('')
      setPrice(0)
      setInfo('Создано.')
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
          <div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Товары / услуги</div>
            <div style={{ color: 'rgba(0,0,0,0.55)', fontSize: 13, marginTop: 6 }}>Каталог для быстрой продажи и демо-сценариев.</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => void reload()} disabled={busy}>Обновить</button>
          </div>
        </div>
      </div>

      {canEdit ? (
        <div className="card cardFull">
          <div className="row">
            <div style={{ flex: 1 }}>
              <input className="input" value={code} onChange={e => setCode(e.target.value)} placeholder="Код (например E2E_COFFEE)" />
            </div>
            <div style={{ flex: 2 }}>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Название" />
            </div>
            <div style={{ width: 160 }}>
              <input className="input" value={kind} onChange={e => setKind(e.target.value)} placeholder="Тип" />
            </div>
            <div style={{ width: 140 }}>
              <input className="input" value={price} onChange={e => setPrice(Math.max(0, Number(e.target.value || 0)))} placeholder="Цена" />
            </div>
            <button className="btn btnPrimary" disabled={busy || !code.trim() || !name.trim()} onClick={() => void onCreate()}>
              Создать
            </button>
          </div>
          {info ? <div style={{ marginTop: 10, color: 'rgba(0,0,0,0.65)' }}>{info}</div> : null}
        </div>
      ) : (
        <div className="card cardFull" style={{ color: 'rgba(0,0,0,0.55)' }}>
          У вас нет прав на создание/изменение каталога.
        </div>
      )}

      <div className="card cardFull">
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Список</div>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Код</th>
              <th>Название</th>
              <th>Тип</th>
              <th>Цена</th>
              <th>Активен</th>
            </tr>
          </thead>
          <tbody>
            {items.map(p => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.code}</td>
                <td>{p.name}</td>
                <td>{p.kind}</td>
                <td>{money(p.price)} ₽</td>
                <td><span className={`pill ${p.active ? 'pillGood' : 'pillWarn'}`}>{p.active ? 'Да' : 'Нет'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PosView(props: {
  refreshCustomers: () => Promise<void>
  onSaleDone: (customerId: number) => Promise<void>
  products: Array<{ id: number; code: string; name: string; kind: string; price: number; active: boolean }>
  reloadProducts: () => Promise<void>
}) {
  const { refreshCustomers, onSaleDone, products, reloadProducts } = props

  const [mode, setMode] = useState<'phone' | 'qr' | 'name'>('phone')
  const [input, setInput] = useState('')
  const [found, setFound] = useState<number | null>(null)
  const [items, setItems] = useState<Array<{ code: string; name: string; price: number; qty: number }>>([
    { code: 'COFFEE', name: 'Капучино', price: 240, qty: 1 },
    { code: 'DESSERT', name: 'Чизкейк', price: 190, qty: 1 }
  ])
  const [productPick, setProductPick] = useState<number | ''>('')
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
        <div className="row" style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 800 }}>Каталог</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" disabled={busy} onClick={() => void reloadProducts()}>
              Обновить
            </button>
          </div>
        </div>
        <div className="row">
          <select className="input" value={productPick} onChange={e => setProductPick((e.target.value ? Number(e.target.value) : '') as any)} style={{ maxWidth: 520 }}>
            <option value="">Выберите товар/услугу</option>
            {products.filter(p => p.active).map(p => (
              <option key={p.id} value={p.id}>
                {p.code} · {p.name} · {money(p.price)} ₽
              </option>
            ))}
          </select>
          <button
            className="btn btnPrimary"
            disabled={busy || !productPick}
            onClick={() => {
              const p = products.find(x => x.id === Number(productPick))
              if (!p) return
              setItems(prev => {
                const idx = prev.findIndex(it => it.code === p.code)
                if (idx >= 0) {
                  return prev.map((it, i) => (i === idx ? { ...it, qty: it.qty + 1 } : it))
                }
                return [{ code: p.code, name: p.name, price: p.price, qty: 1 }, ...prev]
              })
              setProductPick('')
            }}
          >
            Добавить в чек
          </button>
        </div>
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

  async function copyWithAutoClear(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setInfo('Скопировано.')
      window.setTimeout(async () => {
        try {
          const current = await navigator.clipboard.readText()
          if (current === text) {
            await navigator.clipboard.writeText('')
          }
        } catch {
        }
      }, 12000)
    } catch {
      setInfo('Не удалось скопировать.')
    }
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
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" readOnly value={webhookUrl} />
                <button className="btn" onClick={() => void copyWithAutoClear(webhookUrl)} type="button">
                  Копировать
                </button>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', marginTop: 8 }}>
                Заголовок авторизации: x-integration-secret
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <input className="input" readOnly value={selected.secret} />
                <button className="btn" onClick={() => void copyWithAutoClear(selected.secret)} type="button">
                  Копировать
                </button>
              </div>
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

function PermissionsTable() {
  const [data, setData] = useState<{ items: Array<{ role: string; permissions: Array<{ permission: string; is_allowed: boolean }> }>; all_permissions: string[] } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setBusy(true)
    setError(null)
    try {
      const res = await Api.permissions()
      setData(res)
    } catch (e: any) {
      setError(String(e?.message || e))
    } finally {
      setBusy(false)
    }
  }

  async function toggle(role: string, perm: string, current: boolean) {
    if (busy) return
    const next = !current
    // Optimistic update
    setData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        items: prev.items.map(r => {
          if (r.role !== role) return r
          return {
            ...r,
            permissions: r.permissions.map(p => (p.permission === perm ? { ...p, is_allowed: next } : p))
          }
        })
      }
    })

    try {
      await Api.updatePermission(role, perm, next)
    } catch (e: any) {
      setError(String(e?.message || e))
      await load() // Revert
    }
  }

  if (!data) return <div style={{ padding: 20 }}>Загрузка прав доступа...</div>

  return (
    <div className="card cardFull">
      <div className="row">
        <div style={{ fontWeight: 800 }}>Управление доступом (Роли)</div>
        <button className="btn" onClick={() => void load()} disabled={busy}>
          Обновить
        </button>
      </div>
      <div style={{ overflowX: 'auto', marginTop: 12 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Разрешение</th>
              {data.items.map(r => (
                <th key={r.role} style={{ textAlign: 'center' }}>
                  {roleLabel(r.role)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.all_permissions.map(perm => (
              <tr key={perm}>
                <td style={{ fontSize: 13, fontFamily: 'monospace', color: '#555' }}>{perm}</td>
                {data.items.map(roleGroup => {
                  const p = roleGroup.permissions.find(x => x.permission === perm)
                  const allowed = p?.is_allowed || false
                  const isOwner = roleGroup.role === 'owner'
                  return (
                    <td key={roleGroup.role} style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={allowed}
                        onChange={() => void toggle(roleGroup.role, perm, allowed)}
                        disabled={busy || isOwner}
                        style={{ cursor: isOwner ? 'default' : 'pointer', transform: 'scale(1.2)' }}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error ? <div style={{ marginTop: 10, color: '#8b0000' }}>{error}</div> : null}
    </div>
  )
}

export default App
