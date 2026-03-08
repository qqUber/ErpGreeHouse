import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboard } from './hooks/useDashboard';
import { MarketingWidget } from './components/dashboard/MarketingWidget';
import { IntegrationsWidget } from './components/dashboard/IntegrationsWidget';
import { CustomersWidget } from './components/dashboard/CustomersWidget';
import { ProductsWidget } from './components/dashboard/ProductsWidget';
import { OperationalWidget } from './components/dashboard/OperationalWidget';
import { OperatorDashboard } from './components/dashboard/OperatorDashboard';
import { ManagerDashboard } from './components/dashboard/ManagerDashboard';
import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { DashboardWrapper } from './components/dashboard/DashboardWrapper';
import {
  AdminMe,
  Api,
  CustomerDetails,
  CustomerListItem,
  Dashboard,
  getAdminSecret,
  Integration,
  IntegrationDelivery,
  IntegrationTemplate,
  Product,
  SalesStats,
  setAdminSecret,
} from './api';
import { IntegrationSettings } from './components/IntegrationSettings';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { useAuth } from './stores/auth';
import { ComplianceView } from './ComplianceView';
import { MarketingView } from './MarketingView';
import { AnalyticsView } from './AnalyticsView';
import { CustomersTable } from './components/CustomersTable';
import { ProductsTable } from './components/ProductsTable';

type Tab =
  | 'dashboard'
  | 'customers'
  | 'pos'
  | 'integrations'
  | 'products'
  | 'settings'
  | 'marketing'
  | 'compliance'
  | 'analytics';

type PublicStatus = {
  api: string;
  admin_auth_configured: boolean;
  erp_sync_enabled: boolean;
};

type AuthStatus = {
  bootstrap_enabled: boolean;
  default_admin_present: boolean;
  default_admin_username: string;
  must_change_password: boolean;
};

type NoticeLevel = 'ok' | 'warn' | 'err';
type Notice = { level: NoticeLevel; message: string; visible: boolean };

type AuthFlow = {
  active: boolean;
  step: number;
  percent: number;
  label: string;
  steps: Array<{ label: string; done: boolean }>;
};

function money(n: number) {
  return new Intl.NumberFormat('ru-RU').format(n);
}

function App() {
  // Use auth context for authentication state
  const { t } = useTranslation();

  // Role label helper - uses translation from component scope
  function roleLabel(role: string) {
    const r = String(role || '').toLowerCase();
    if (r === 'owner') return t('roles.owner');
    if (r === 'operator') return t('roles.operator');
    if (r === 'marketer') return t('roles.marketer');
    return r || '—';
  }

  const {
    isAuthenticated,
    isLoading: authLoading,
    user,
    mustChangePassword: authMustChangePassword,
    login: authLogin,
    logout: authLogout,
    setUser: setAuthUser,
    validateToken,
  } = useAuth();

  const [tab, setTab] = useState<Tab>('dashboard');
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [details, setDetails] = useState<CustomerDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [customerPage, setCustomerPage] = useState(1);
  const [customerTotal, setCustomerTotal] = useState(0);
  const [customerLimit] = useState(50);
  const [productPage, setProductPage] = useState(1);
  const [productTotal, setProductTotal] = useState(0);
  const [productLimit] = useState(50);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [authFlow, setAuthFlow] = useState<AuthFlow | null>(null);
  const authAbortRef = useRef<AbortController | null>(null);
  const authWorkerRef = useRef<Worker | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showSettingsOld, setShowSettingsOld] = useState(false);
  const [showSettingsNew, setShowSettingsNew] = useState(false);

  const [publicStatus, setPublicStatus] = useState<PublicStatus | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [loginMode, setLoginMode] = useState<'password' | 'key' | 'recover'>('password');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [recoverySecret, setRecoverySecret] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [adminKey, setAdminKey] = useState(getAdminSecret());
  const [authReady, setAuthReady] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [settingsNewPassword, setSettingsNewPassword] = useState('');
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [integrationTemplates, setIntegrationTemplates] = useState<IntegrationTemplate[]>([]);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<number | null>(null);
  const [integrationDeliveries, setIntegrationDeliveries] = useState<IntegrationDelivery[]>([]);
  const [integrationsBusy, setIntegrationsBusy] = useState(false);
  const [integrationSubTab, setIntegrationSubTab] = useState<'settings' | 'webhooks'>('settings');
  const [me, setMe] = useState<AdminMe | null>(null);
  const [products, setProducts] = useState<
    Array<{ id: number; code: string; name: string; kind: string; price: number; active: boolean }>
  >([]);
  const [showProductImport, setShowProductImport] = useState(false);
  const [optimisticReady, setOptimisticReady] = useState(false); // Оптимистичный UI

  // Use auth context values
  const effectiveAuthReady = !authLoading && (isAuthenticated || authReady);
  const effectiveMe = user || me;
  const effectiveMustChangePassword = authMustChangePassword || mustChangePassword;

  console.log(
    `[App] Render. LoginMode=${loginMode} Username=${username} PasswordLen=${password.length} Notice=${notice ? JSON.stringify(notice) : 'null'} AuthLoading=${authLoading} IsAuth=${isAuthenticated}`
  );

  // Session restoration: check auth context on mount
  useEffect(() => {
    console.log('[App] Auth context check:', { authLoading, isAuthenticated, user: !!user });
    if (!authLoading) {
      if (isAuthenticated && user) {
        console.log('[App] Session restored from JWT cookies');
        setMe(user);
        setAuthReady(true);
        setOptimisticReady(true);
      } else {
        console.log('[App] No valid session, showing login');
        setAuthReady(false);
        setOptimisticReady(true);
      }
    }
  }, [authLoading, isAuthenticated, user]);

  const selected = useMemo(
    () => customers.find((c) => c.id === selectedId) || null,
    [customers, selectedId]
  );
  const selectedIntegration = useMemo(
    () => integrations.find((i) => i.id === selectedIntegrationId) || null,
    [integrations, selectedIntegrationId]
  );

  // Navigation function for deep linking
  function navigateTo(tabName: string, params?: Record<string, string | number>) {
    let hash = `#${tabName}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        searchParams.set(key, String(value));
      });
      hash += `?${searchParams.toString()}`;
    }
    window.location.hash = hash;
  }

  function clipMessage(s: string) {
    const t = String(s || '')
      .replace(/\s+/g, ' ')
      .trim();
    return t.length > 80 ? `${t.slice(0, 77)}...` : t;
  }

  function showNotice(level: NoticeLevel, message: string) {
    console.log(`[App] showNotice: ${level} - ${message}`);
    const m = clipMessage(message);
    setNotice({ level, message: m, visible: true });
    window.setTimeout(() => setNotice((prev) => (prev ? { ...prev, visible: false } : prev)), 3500);
  }

  function stopAuthFlow() {
    console.log('[App] stopAuthFlow called');
    authAbortRef.current?.abort();
    authAbortRef.current = null;
    authWorkerRef.current?.postMessage({ type: 'stop' });
    authWorkerRef.current?.terminate();
    authWorkerRef.current = null;
    setAuthFlow(null);
  }

  async function loadPublicStatus() {
    try {
      const s = await Api.publicStatus();
      setPublicStatus(s);
    } catch {
      setPublicStatus(null);
    }
  }

  async function loadAuthStatus() {
    try {
      const s = await Api.authStatus();
      setAuthStatus(s);
      if (!username.trim() && s.default_admin_username) {
        setUsername(s.default_admin_username);
      }
    } catch {
      setAuthStatus(null);
    }
  }

  async function loadDashboard() {
    setError(null);
    const d = await Api.dashboard();
    setDash(d);
  }

  async function loadCustomers(query?: string, page: number = 1) {
    setError(null);
    const res = await Api.customers(query, page, customerLimit);
    setCustomers(res.items);
    if (res.pagination) {
      setCustomerPage(res.pagination.page);
      setCustomerTotal(res.pagination.total);
    }
  }

  async function loadCustomer(id: number) {
    setError(null);
    const d = await Api.customer(id);
    setDetails(d);
  }

  async function loadIntegrations() {
    setError(null);
    setIntegrationsBusy(true);
    try {
      const res = await Api.integrations();
      setIntegrations(res);
    } finally {
      setIntegrationsBusy(false);
    }
  }

  async function loadDeliveries(id: number) {
    setError(null);
    const res = await Api.integrationDeliveries(id);
    setIntegrationDeliveries(res.items);
  }

  async function loadIntegrationTemplates() {
    setError(null);
    const res = await Api.integrationTemplates();
    setIntegrationTemplates(res.items);
  }

  async function loadProducts(query?: string, page: number = 1) {
    setError(null);
    const res = await Api.products(query, page, productLimit);
    setProducts(res.items);
    if (res.pagination) {
      setProductPage(res.pagination.page);
      setProductTotal(res.pagination.total);
    }
  }

  async function bootstrap() {
    setError(null);
    try {
      // First, load public status (no auth required)
      await loadPublicStatus();
      await loadAuthStatus();

      // Check if user is authenticated from auth context
      if (user) {
        // Use the user data from auth context instead of making redundant Api.me() call
        setMe(user);
        console.log('[Bootstrap] Using user from auth context:', user.username);

        // Load protected data since user is authenticated
        try {
          await Promise.all([loadDashboard(), loadCustomers(), loadProducts()]);
        } catch (dataError: any) {
          // Failed to load protected data, but user is authenticated
          console.warn('[Bootstrap] Failed to load some data:', dataError?.message);
        }
      } else {
        // Not authenticated - this is expected, user needs to login
        console.log('[Bootstrap] Not authenticated');
        setMe(null);
      }

      setAuthReady(true);
      setOptimisticReady(true); // UI готов
    } catch (e: any) {
      const msg = String(e?.message || e);
      // Only show error for actual errors, not auth-related issues
      if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
        setAuthReady(false);
        setOptimisticReady(false);
        return;
      }
      showNotice('err', msg);
      setAuthReady(false);
      setOptimisticReady(false);
    }
  }

  // Handle keyboard shortcuts for mouse-less operation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+1, Ctrl+2, etc. for tab switching (similar to browsers)
      if (e.ctrlKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            setTab('dashboard');
            break;
          case '2':
            e.preventDefault();
            setTab('customers');
            break;
          case '3':
            e.preventDefault();
            setTab('products');
            break;
          case '4':
            e.preventDefault();
            setTab('pos');
            break;
          case '5':
            e.preventDefault();
            setTab('marketing');
            break;
          case '6':
            e.preventDefault();
            setTab('analytics');
            break;
          case '7':
            e.preventDefault();
            setTab('settings');
            break;
        }
      }
      
      // Escape key to clear search
      if (e.key === 'Escape') {
        setQ('');
        setCustomerPage(1);
        setProductPage(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [q, customerPage, productPage]);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        setPassword('');
        setNewPassword('');
        setRecoverySecret('');
        setOldPassword('');
        setSettingsNewPassword('');
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    if (selectedId != null && authReady) {
      loadCustomer(selectedId).catch((e) => setError(String(e)));
    }
  }, [selectedId, authReady]);

  // Hash-based navigation handler
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1); // Remove leading '#'
      if (!hash) return;

      const [tabName, queryString] = hash.split('?');
      const params = new URLSearchParams(queryString || '');

      // Map hash to tab
      const tabMap: Record<string, Tab> = {
        dashboard: 'dashboard',
        customers: 'customers',
        pos: 'pos',
        integrations: 'integrations',
        products: 'products',
        settings: 'settings',
        marketing: 'marketing',
      };

      if (tabMap[tabName]) {
        setTab(tabMap[tabName]);
      }

      // Handle query parameters
      const customerId = params.get('customer');
      if (customerId) {
        const id = parseInt(customerId, 10);
        if (!isNaN(id)) {
          setSelectedId(id);
        }
      }

      const orderId = params.get('order');
      if (orderId) {
        // For now, just show in notification - could navigate to order details
        console.log('Order ID:', orderId);
      }
    };

    // Handle initial hash
    if (window.location.hash) {
      handleHashChange();
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (tab === 'integrations') {
      Promise.all([loadIntegrations(), loadIntegrationTemplates()]).catch((e) =>
        setError(String(e))
      );
    }
  }, [tab, authReady]);

  useEffect(() => {
    if (!authReady) return;
    if (selectedIntegrationId != null) {
      loadDeliveries(selectedIntegrationId).catch((e) => setError(String(e)));
    }
  }, [selectedIntegrationId, authReady]);

  // Handle customer pagination
  useEffect(() => {
    if (!authReady) return;
    if (tab === 'customers') {
      loadCustomers(q, customerPage).catch((e) => setError(String(e)));
    }
  }, [tab, authReady, q, customerPage]);

  // Handle product pagination
  useEffect(() => {
    if (!authReady) return;
    if (tab === 'products') {
      loadProducts(q, productPage).catch((e) => setError(String(e)));
    }
  }, [tab, authReady, q, productPage]);

  function startAuthFlowSteps(labels: string[]) {
    stopAuthFlow();
    const ctrl = new AbortController();
    authAbortRef.current = ctrl;
    const steps = labels.map((label) => ({ label, done: false }));
    setAuthFlow({ active: true, step: 0, percent: 0, label: steps[0]?.label || '', steps });
    const w = new Worker(new URL('./authWorker.ts', import.meta.url), { type: 'module' });
    authWorkerRef.current = w;
    w.onmessage = (e) => {
      const m = e.data as any;
      if (m?.type === 'progress') {
        setAuthFlow((prev) =>
          prev ? { ...prev, step: m.step, percent: m.percent, label: m.label } : prev
        );
      }
    };
    w.postMessage({ type: 'start', steps: labels.map((label) => ({ label })) });
    return ctrl.signal;
  }

  function markAuthStepDone(stepIndex: number) {
    authWorkerRef.current?.postMessage({ type: 'completeStep', step: stepIndex });
    setAuthFlow((prev) => {
      if (!prev) return prev;
      const next = prev.steps.map((s, i) => (i === stepIndex ? { ...s, done: true } : s));
      return { ...prev, steps: next };
    });
  }

  function setAuthStep(stepIndex: number, label: string) {
    authWorkerRef.current?.postMessage({ type: 'setStep', step: stepIndex, label });
    setAuthFlow((prev) => (prev ? { ...prev, step: stepIndex, label } : prev));
  }

  async function doLoginByKey() {
    setError(null);
    try {
      const signal = startAuthFlowSteps([
        t('authFlow.connecting'),
        t('authFlow.checkingKey'),
        t('authFlow.creatingSession'),
      ]);
      setAuthStep(0, t('authFlow.connectingServer'));
      await Api.publicStatus(signal);
      markAuthStepDone(0);

      setAuthStep(1, t('authFlow.checkingKey_'));
      setMustChangePassword(false);
      setAdminSecret(adminKey.trim());
      markAuthStepDone(1);

      setAuthStep(2, t('authFlow.creatingSession_'));
      await bootstrap();
      markAuthStepDone(2);
      showNotice('ok', t('auth.loginSuccess'));
      stopAuthFlow();
    } catch (e: any) {
      console.log(`[App] Login failed: ${e?.message || e}`);
      if (
        String(e?.name || '')
          .toLowerCase()
          .includes('abort')
      ) {
        showNotice('warn', t('auth.loginCancelled'));
      } else {
        showNotice('err', String(e?.message || e));
      }
      stopAuthFlow();
    }
  }

  async function doLoginByPassword() {
    console.log('[App] doLoginByPassword started');
    console.log(
      '[App] Current auth state before login - isAuthenticated:',
      isAuthenticated,
      'user:',
      user
    );
    setError(null);
    try {
      const signal = startAuthFlowSteps([
        t('authFlow.connecting'),
        t('authFlow.checkingCredentials'),
        t('authFlow.creatingSession'),
      ]);
      setAuthStep(0, t('authFlow.connectingServer'));
      await Promise.all([Api.publicStatus(signal), Api.authStatus(signal)]);
      markAuthStepDone(0);

      setAuthStep(1, t('authFlow.verifyingCredentials'));
      // Use auth context login which handles JWT cookies automatically
      await authLogin(username.trim(), password);
      console.log(
        '[App] Auth login completed, checking auth state - isAuthenticated:',
        isAuthenticated,
        'user:',
        user
      );
      setMustChangePassword(authMustChangePassword);
      setPassword('');
      // Note: JWT tokens are in httpOnly cookies, no need to setAdminSecret
      markAuthStepDone(1);

      setAuthStep(2, t('authFlow.creatingSession_'));
      console.log('[App] Calling bootstrap with user:', user);
      await bootstrap();
      markAuthStepDone(2);
      if (authMustChangePassword || mustChangePassword) {
        setTab('settings');
      }
      showNotice('ok', t('auth.loginSuccess'));
      stopAuthFlow();
    } catch (e: any) {
      console.error(`[App] Login failed (catch):`, e);
      console.error(`[App] Login failed message:`, e.message);
      if (
        String(e?.name || '')
          .toLowerCase()
          .includes('abort')
      ) {
        showNotice('warn', t('auth.loginCancelled'));
      } else {
        showNotice('err', String(e?.message || e));
      }
      stopAuthFlow();
    }
  }

  async function doRecoverPassword() {
    setError(null);
    try {
      const signal = startAuthFlowSteps([
        t('authFlow.connecting'),
        t('authFlow.checkingData'),
        t('authFlow.resettingPassword'),
      ]);
      setAuthStep(0, t('authFlow.connectingServer'));
      await Promise.all([Api.publicStatus(signal), Api.authStatus(signal)]);
      markAuthStepDone(0);

      setAuthStep(1, t('authFlow.checkingData_'));
      markAuthStepDone(1);

      setAuthStep(2, t('authFlow.resettingPassword_'));
      await Api.recoverPassword(username.trim(), newPassword, recoverySecret, signal);
      markAuthStepDone(2);
      setRecoverySecret('');
      setNewPassword('');
      setPassword('');
      setLoginMode('password');
      showNotice('ok', t('auth.passwordResetSuccess'));
      stopAuthFlow();
    } catch (e: any) {
      if (
        String(e?.name || '')
          .toLowerCase()
          .includes('abort')
      ) {
        showNotice('warn', t('auth.operationCancelled'));
      } else {
        showNotice('err', String(e?.message || e));
      }
      stopAuthFlow();
    }
  }

  async function doChangePassword() {
    setError(null);
    try {
      const signal = startAuthFlowSteps([
        t('authFlow.checkingCredentials'),
        t('authFlow.updatingPassword'),
        t('authFlow.completing'),
      ]);
      setAuthStep(0, t('authFlow.verifyingCredentials'));
      markAuthStepDone(0);

      setAuthStep(1, t('authFlow.updatingPassword_'));
      await Api.changePassword(oldPassword, settingsNewPassword, signal);
      markAuthStepDone(1);

      setAuthStep(2, t('authFlow.completing'));
      setOldPassword('');
      setSettingsNewPassword('');
      setAdminSecret('');
      setAdminKey('');
      setAuthReady(false);
      setMustChangePassword(false);
      setTab('dashboard');
      markAuthStepDone(2);
      showNotice('ok', t('auth.passwordChanged'));
      stopAuthFlow();
    } catch (e: any) {
      if (
        String(e?.name || '')
          .toLowerCase()
          .includes('abort')
      ) {
        showNotice('warn', 'Операция отменена.');
      } else {
        showNotice('err', String(e?.message || e));
      }
      stopAuthFlow();
    }
  }

  async function doLogout() {
    setError(null);
    try {
      // Use auth context logout which clears JWT cookies automatically
      await authLogout();
    } catch {
    } finally {
      setAdminSecret('');
      setAdminKey('');
      setAuthReady(false);
      setMustChangePassword(false);
      setMe(null);
      setTab('dashboard');
      showNotice('ok', t('auth.loggedOut'));
    }
  }

  const allowedTabs: Tab[] = useMemo(() => {
    if (!effectiveAuthReady)
      return [
        'dashboard',
        'customers',
        'pos',
        'integrations',
        'products',
        'settings',
        'marketing',
        'compliance',
      ];
    const effectiveUser = user || me;
    // If authenticated but user data not yet loaded, show all tabs temporarily
    // This prevents race condition where effectiveAuthReady=true but me is still null
    if (!effectiveUser)
      return [
        'dashboard',
        'customers',
        'pos',
        'integrations',
        'products',
        'settings',
        'marketing',
        'compliance',
      ];
    const role = String(effectiveUser?.role || '').toLowerCase();
    if (role === 'owner')
      return [
        'dashboard',
        'customers',
        'pos',
        'integrations',
        'products',
        'settings',
        'marketing',
        'compliance',
      ];

    const perms = new Set(effectiveUser?.permissions || []);
    // If user has '*' permission, they see everything (though owner check above covers this usually)
    if (perms.has('*'))
      return [
        'dashboard',
        'customers',
        'pos',
        'integrations',
        'products',
        'settings',
        'marketing',
        'compliance',
        'analytics',
      ];

    const tabs: Tab[] = [];
    if (perms.has('dashboard.read')) tabs.push('dashboard');
    if (perms.has('customer.list') || perms.has('customer.read')) tabs.push('customers');
    if (perms.has('pos.sale')) tabs.push('pos');
    if (perms.has('integration.read')) tabs.push('integrations');
    if (perms.has('product.read')) tabs.push('products');
    // Settings is always available for password change, but content inside depends on permissions
    tabs.push('settings');
    if (perms.has('marketing.campaign')) tabs.push('marketing');
    if (perms.has('customer.delete') || perms.has('customer.read')) tabs.push('compliance');
    if (perms.has('dashboard.read')) tabs.push('analytics');

    return tabs;
  }, [effectiveAuthReady, user, me?.role, me?.permissions]);

  const safeTab: Tab = useMemo(() => {
    if (!effectiveAuthReady) return tab;
    return allowedTabs.includes(tab) ? tab : allowedTabs[0] || 'dashboard';
  }, [tab, effectiveAuthReady, allowedTabs]);

  useEffect(() => {
    if (!effectiveAuthReady) return;
    if (tab !== safeTab) setTab(safeTab);
  }, [safeTab, tab, effectiveAuthReady]);

  return (
    <div className="container">
      <header role="banner" className="header">
        <div className="brand">
          <h1 style={{ fontWeight: 800, fontSize: 'var(--font-size-xl)', margin: 0 }}>
            {t('app.controlPanel')}
          </h1>
        </div>
        <nav role="navigation" aria-label="Main navigation">
          <div className="tabs" role="tablist" aria-label="Main navigation">
            {allowedTabs.includes('dashboard') ? (
              <button
                id="dashboard-tab"
                className={`tab ${safeTab === 'dashboard' ? 'tabActive' : ''}`}
                onClick={() => setTab('dashboard')}
                role="tab"
                aria-selected={safeTab === 'dashboard'}
                aria-controls="dashboard-panel"
                data-testid="admin_nav_dashboard_en"
              >
                {t('menu.dashboard')}
              </button>
            ) : null}
            {allowedTabs.includes('customers') ? (
              <button
                id="customers-tab"
                className={`tab ${safeTab === 'customers' ? 'tabActive' : ''}`}
                onClick={() => setTab('customers')}
                role="tab"
                aria-selected={safeTab === 'customers'}
                aria-controls="customers-panel"
                data-testid="admin_nav_customers_en"
              >
                {t('menu.clients')}
              </button>
            ) : null}
            {allowedTabs.includes('pos') ? (
              <button
                id="pos-tab"
                className={`tab ${safeTab === 'pos' ? 'tabActive' : ''}`}
                onClick={() => setTab('pos')}
                role="tab"
                aria-selected={safeTab === 'pos'}
                aria-controls="pos-panel"
                data-testid="admin_nav_pos_en"
              >
                {t('sales.title')}
              </button>
            ) : null}
            {allowedTabs.includes('integrations') ? (
              <button
                id="integrations-tab"
                className={`tab ${safeTab === 'integrations' ? 'tabActive' : ''}`}
                onClick={() => setTab('integrations')}
                role="tab"
                aria-selected={safeTab === 'integrations'}
                aria-controls="integrations-panel"
                data-testid="admin_nav_integrations_en"
              >
                {t('menu.integrations')}
              </button>
            ) : null}
            {allowedTabs.includes('products') ? (
              <button
                id="products-tab"
                className={`tab ${safeTab === 'products' ? 'tabActive' : ''}`}
                onClick={() => setTab('products')}
                role="tab"
                aria-selected={safeTab === 'products'}
                aria-controls="products-panel"
                data-testid="admin_nav_products_en"
              >
                {t('menu.products')}
              </button>
            ) : null}
            {allowedTabs.includes('settings') ? (
              <button
                id="settings-tab"
                className={`tab ${safeTab === 'settings' ? 'tabActive' : ''}`}
                onClick={() => setTab('settings')}
                role="tab"
                aria-selected={safeTab === 'settings'}
                aria-controls="settings-panel"
                data-testid="admin_nav_settings_en"
              >
                {t('menu.settings')}
              </button>
            ) : null}
            {allowedTabs.includes('marketing') ? (
              <button
                id="marketing-tab"
                className={`tab ${safeTab === 'marketing' ? 'tabActive' : ''}`}
                onClick={() => setTab('marketing')}
                role="tab"
                aria-selected={safeTab === 'marketing'}
                aria-controls="marketing-panel"
                data-testid="admin_nav_marketing_en"
              >
                {t('menu.marketing')}
              </button>
            ) : null}
            {allowedTabs.includes('compliance') ? (
              <button
                id="compliance-tab"
                className={`tab ${safeTab === 'compliance' ? 'tabActive' : ''}`}
                onClick={() => setTab('compliance')}
                role="tab"
                aria-selected={safeTab === 'compliance'}
                aria-controls="compliance-panel"
                data-testid="admin_nav_compliance_en"
              >
                {t('menu.compliance')}
              </button>
            ) : null}
            {allowedTabs.includes('analytics') ? (
              <button
                id="analytics-tab"
                className={`tab ${safeTab === 'analytics' ? 'tabActive' : ''}`}
                onClick={() => setTab('analytics')}
                role="tab"
                aria-selected={safeTab === 'analytics'}
                aria-controls="analytics-panel"
                data-testid="admin_nav_analytics_en"
              >
                {t('menu.analytics')}
              </button>
            ) : null}
          </div>
        </nav>
        {authReady ? (
          <div className="pill">
            {t('common.role')}: {roleLabel(me?.role || '')}
          </div>
        ) : null}
        <LanguageSwitcher />
      </header>

      <main role="main" aria-label="Main content">
        {notice ? (
          <div className="grid">
            <StatusBar notice={notice} />
          </div>
        ) : null}

        {/* Show login form when not authenticated OR when auth is still loading */}
        {!authReady || (!user && authReady) ? (
          <div className="grid">
            <div className="card cardFull">
              <div className="row">
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{t('auth.login')}</div>
                  <div style={{ color: 'rgba(0,0,0,0.55)', fontSize: 13, marginTop: 6 }}>
                    {t('auth.accessSettingsDesc')}
                  </div>
                </div>
                <div className="pill">
                  {t('auth.apiStatus')}: {publicStatus?.api || t('auth.apiUnavailable')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <button
                  className={`btn ${loginMode === 'password' ? 'btnPrimary' : ''}`}
                  onClick={() => setLoginMode('password')}
                  data-testid="common_btn_password_login_en"
                >
                  {t('auth.byPassword')}
                </button>
                <button
                  className={`btn ${loginMode === 'key' ? 'btnPrimary' : ''}`}
                  onClick={() => setLoginMode('key')}
                  data-testid="common_btn_key_login_en"
                >
                  {t('auth.byKey')}
                </button>
                <button
                  className={`btn ${loginMode === 'recover' ? 'btnPrimary' : ''}`}
                  onClick={() => setLoginMode('recover')}
                  data-testid="common_btn_recovery_en"
                >
                  {t('auth.recovery')}
                </button>
                <button
                  className="btn"
                  onClick={() => void loadPublicStatus()}
                  data-testid="common_btn_api_status_en"
                >
                  {t('auth.apiStatus')}
                </button>
              </div>

              {loginMode === 'password' ? (
                <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                  <div className="row">
                    <div style={{ flex: 1 }}>
                      <input
                        className="input"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder={t('auth.loginPlaceholder')}
                        autoComplete="off"
                        spellCheck={false}
                        data-testid="common_input_username_en"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          className="input"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={t('auth.passwordPlaceholder')}
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="off"
                          spellCheck={false}
                          data-testid="common_input_password_en"
                        />
                        <button
                          className="btn"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={t('forms.labels.showPassword')}
                          type="button"
                          data-testid="common_btn_toggle_password_en"
                        >
                          {showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                        </button>
                      </div>
                    </div>
                    <button
                      className="btn btnPrimary"
                      onClick={() => void doLoginByPassword()}
                      disabled={!username.trim() || !password}
                      data-testid="common_btn_login_en"
                    >
                      {t('auth.loginButton')}
                    </button>
                  </div>
                  <div style={{ color: 'rgba(0,0,0,0.55)', fontSize: 12 }}>
                    {authStatus?.default_admin_present
                      ? `${t('auth.defaultAdmin')}: ${authStatus.default_admin_username}`
                      : t('auth.defaultAdminNotCreated')}
                  </div>
                </div>
              ) : null}

              {loginMode === 'key' ? (
                <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 320px' }}>
                    <input
                      className="input"
                      value={adminKey}
                      onChange={(e) => setAdminKey(e.target.value)}
                      placeholder="x-admin-secret"
                      autoComplete="off"
                      spellCheck={false}
                      data-testid="common_input_admin_key_en"
                    />
                  </div>
                  <button
                    className="btn btnPrimary"
                    onClick={() => void doLoginByKey()}
                    disabled={!adminKey.trim()}
                    data-testid="common_btn_key_login_submit_en"
                  >
                    {t('auth.loginButton')}
                  </button>
                </div>
              ) : null}

              {loginMode === 'recover' ? (
                <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                  <div className="row">
                    <div style={{ flex: 1 }}>
                      <input
                        className="input"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder={t('auth.loginPlaceholder')}
                        autoComplete="off"
                        spellCheck={false}
                        data-testid="common_input_recover_username_en"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          className="input"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder={t('auth.newPasswordPlaceholder')}
                          type={showNewPassword ? 'text' : 'password'}
                          autoComplete="off"
                          spellCheck={false}
                          data-testid="common_input_recover_new_password_en"
                        />
                        <button
                          className="btn"
                          onClick={() => setShowNewPassword((v) => !v)}
                          aria-label={t('forms.labels.showPassword')}
                          type="button"
                          data-testid="common_btn_toggle_new_password_en"
                        >
                          {showNewPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div style={{ flex: 1 }}>
                      <input
                        className="input"
                        value={recoverySecret}
                        onChange={(e) => setRecoverySecret(e.target.value)}
                        placeholder={t('auth.recoveryCode')}
                        type="password"
                        autoComplete="off"
                        spellCheck={false}
                        data-testid="common_input_recovery_secret_en"
                      />
                    </div>
                    <button
                      className="btn btnPrimary"
                      onClick={() => void doRecoverPassword()}
                      disabled={!username.trim() || newPassword.length < 8 || !recoverySecret}
                      data-testid="common_btn_reset_password_en"
                    >
                      {t('auth.resetPassword')}
                    </button>
                  </div>
                </div>
              ) : null}

              {mustChangePassword ? (
                <div style={{ marginTop: 12, color: '#8b0000' }}>
                  {t('auth.requirePasswordChange')}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {optimisticReady && safeTab === 'dashboard' ? (
          <div id="dashboard-panel" role="tabpanel" aria-labelledby="dashboard-tab">
            <DashboardView dash={dash} reload={() => loadDashboard()} onNavigate={navigateTo} />
          </div>
        ) : null}
        {optimisticReady && safeTab === 'customers' ? (
          <div id="customers-panel" role="tabpanel" aria-labelledby="customers-tab">
            <div className="grid">
              <div className="card cardFull">
                <div className="row mb-4">
                  <div className="flex-1">
                    <input
                      className="input"
                      placeholder={t('customers.searchPlaceholder')}
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      data-testid="customers_search_input_en"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn"
                      onClick={() => {
                        setCustomerPage(1); // Reset to first page on search
                        loadCustomers(q, 1);
                      }}
                      data-testid="customers_search_button_en"
                    >
                      {t('customers.search')}
                    </button>
                    <button
                      className="btn btnPrimary"
                      onClick={() => {
                        setQ('');
                        setCustomerPage(1); // Reset to first page when clearing
                        loadCustomers('', 1);
                      }}
                      data-testid="customers_clear_button_en"
                    >
                      {t('customers.clear')}
                    </button>
                  </div>
                </div>
                  <div className="flex gap-2">
                    <button
                      className="btn"
                      onClick={() => {
                        setCustomerPage(1); // Reset to first page on search
                        loadCustomers(q, 1);
                      }}
                      data-testid="customers_search_button_en"
                    >
                      {t('customers.search')}
                    </button>
                    <button
                      className="btn btnPrimary"
                      onClick={() => {
                        setQ('');
                        setCustomerPage(1); // Reset to first page when clearing
                        loadCustomers('', 1);
                      }}
                      data-testid="customers_clear_button_en"
                    >
                      {t('customers.clear')}
                    </button>
                  </div>
                </div>
                
                <CustomersTable
                  customers={customers}
                  page={customerPage}
                  total={customerTotal}
                  limit={customerLimit}
                  onPageChange={setCustomerPage}
                  onCustomerSelect={setSelectedId}
                  loading={false}
                />
              </div>
            </div>
          </div>
        ) : null}
        {optimisticReady && safeTab === 'pos' ? (
          <div id="pos-panel" role="tabpanel" aria-labelledby="pos-tab">
            <PosView
              refreshCustomers={() => loadCustomers()}
              products={products}
              reloadProducts={() => loadProducts()}
              onSaleDone={async (customerId: number) => {
                await loadDashboard();
                await loadCustomers();
                setSelectedId(customerId);
                setTab('customers');
              }}
            />
          </div>
        ) : null}
        {optimisticReady && safeTab === 'integrations' ? (
          <div id="integrations-panel" role="tabpanel" aria-labelledby="integrations-tab">
            <div className="grid">
              <div className="card cardWide">
                <div className="tabs" style={{ marginBottom: 15 }}>
                  <div
                    className={`tab ${integrationSubTab === 'settings' ? 'tabActive' : ''}`}
                    onClick={() => setIntegrationSubTab('settings')}
                    data-testid="admin_tab_integration_settings_en"
                  >
                    {t('integrations.botSettings')}
                  </div>
                  <div
                    className={`tab ${integrationSubTab === 'webhooks' ? 'tabActive' : ''}`}
                    onClick={() => setIntegrationSubTab('webhooks')}
                    data-testid="admin_tab_webhooks_en"
                  >
                    {t('integrations.connections')}
                  </div>
                </div>

                {integrationSubTab === 'settings' ? (
                  <IntegrationSettings />
                ) : (
                  <IntegrationsView
                    items={integrations}
                    templates={integrationTemplates}
                    busy={integrationsBusy}
                    selected={selectedIntegration}
                    deliveries={integrationDeliveries}
                    select={(id) => setSelectedIntegrationId(id)}
                    reload={() => loadIntegrations()}
                    create={async (p) => {
                      await Api.createIntegration(p);
                      await loadIntegrations();
                    }}
                    update={async (id, p) => {
                      await Api.updateIntegration(id, p);
                      await loadIntegrations();
                    }}
                    rotate={async (id) => {
                      await Api.rotateIntegrationSecret(id);
                      await loadIntegrations();
                      setSelectedIntegrationId(id);
                    }}
                    remove={async (id) => {
                      await Api.deleteIntegration(id);
                      setSelectedIntegrationId(null);
                      await loadIntegrations();
                    }}
                    refreshDeliveries={async (id) => {
                      await loadDeliveries(id);
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        ) : null}
        {optimisticReady && safeTab === 'products' ? (
          <div id="products-panel" role="tabpanel" aria-labelledby="products-tab">
            <div className="grid">
              <div className="card cardFull">
                <div className="row mb-4">
                  <div className="flex-1">
                    <input
                      className="input"
                      placeholder={t('products.searchPlaceholder')}
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      data-testid="products_search_input_en"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn"
                      onClick={() => {
                        setProductPage(1); // Reset to first page on search
                        loadProducts(q, 1);
                      }}
                      data-testid="products_search_button_en"
                    >
                      {t('products.search')}
                    </button>
                    <button
                      className="btn btnPrimary"
                      onClick={() => {
                        setQ('');
                        setProductPage(1); // Reset to first page when clearing
                        loadProducts('', 1);
                      }}
                      data-testid="products_clear_button_en"
                    >
                      {t('products.clear')}
                    </button>
                  </div>
                </div>
                
                <ProductsTable
                  products={products}
                  page={productPage}
                  total={productTotal}
                  limit={productLimit}
                  onPageChange={setProductPage}
                  loading={false}
                />
              </div>
            </div>
          </div>
        ) : null}
        {optimisticReady && safeTab === 'settings' ? (
          <div id="settings-panel" role="tabpanel" aria-labelledby="settings-tab">
            <div className="grid">
              <div className="card cardFull" data-testid="settings_view_en">
                <div className="row">
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>{t('auth.accessSettings')}</div>
                    <div style={{ color: 'rgba(0,0,0,0.55)', fontSize: 13, marginTop: 6 }}>
                      {mustChangePassword
                        ? t('auth.requirePasswordChangeSettings')
                        : t('auth.accessSettingsDesc')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div className="pill">{t('auth.sessionActive')}</div>
                    <button
                      className="btn"
                      onClick={() => void doLogout()}
                      type="button"
                      data-testid="admin_btn_logout_en"
                    >
                      {t('auth.logout')}
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
                          onChange={(e) => setOldPassword(e.target.value)}
                          placeholder={t('auth.currentPassword')}
                          type={showSettingsOld ? 'text' : 'password'}
                          autoComplete="off"
                          spellCheck={false}
                          data-testid="admin_input_old_password_en"
                        />
                        <button
                          className="btn"
                          onClick={() => setShowSettingsOld((v) => !v)}
                          type="button"
                          data-testid="admin_btn_toggle_old_password_en"
                        >
                          {showSettingsOld ? t('auth.hidePassword') : t('auth.showPassword')}
                        </button>
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          className="input"
                          value={settingsNewPassword}
                          onChange={(e) => setSettingsNewPassword(e.target.value)}
                          placeholder={t('auth.newPassword')}
                          type={showSettingsNew ? 'text' : 'password'}
                          autoComplete="off"
                          spellCheck={false}
                          data-testid="admin_input_new_password_en"
                        />
                        <button
                          className="btn"
                          onClick={() => setShowSettingsNew((v) => !v)}
                          type="button"
                          data-testid="admin_btn_toggle_new_password_en"
                        >
                          {showSettingsNew ? t('auth.hidePassword') : t('auth.showPassword')}
                        </button>
                      </div>
                    </div>
                    <button
                      className="btn btnPrimary"
                      onClick={() => void doChangePassword()}
                      disabled={!oldPassword || settingsNewPassword.length < 8}
                      data-testid="admin_btn_change_password_en"
                    >
                      {t('auth.changePassword')}
                    </button>
                  </div>
                  <div style={{ color: 'rgba(0,0,0,0.55)', fontSize: 12 }}>
                    {t('auth.recoveryInstructions')}
                  </div>
                </div>
              </div>

              {me?.role === 'owner' || (me?.permissions || []).includes('settings.access') ? (
                <PermissionsTable />
              ) : null}
            </div>
          </div>
        ) : null}

        {optimisticReady && safeTab === 'marketing' ? (
          <div id="marketing-panel" role="tabpanel" aria-labelledby="marketing-tab">
            <MarketingView />
          </div>
        ) : null}

        {optimisticReady && safeTab === 'compliance' ? (
          <div id="compliance-panel" role="tabpanel" aria-labelledby="compliance-tab">
            <ComplianceView />
          </div>
        ) : null}
        {optimisticReady && safeTab === 'analytics' ? (
          <div id="analytics-panel" role="tabpanel" aria-labelledby="analytics-tab">
            <AnalyticsView />
          </div>
        ) : null}

        {authFlow?.active ? (
          <div className="overlay" role="dialog" aria-modal="true">
            <div className="overlayPanel">
              <div className="row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="spinner" />
                  <div style={{ fontWeight: 800 }}>{t('authFlow.authorization')}</div>
                </div>
                <button className="btn" onClick={() => stopAuthFlow()} type="button">
                  {t('authFlow.cancel')}
                </button>
              </div>
              <div style={{ marginTop: 10, color: 'rgba(0,0,0,0.65)', fontSize: 13 }}>
                {authFlow.label}
              </div>
              <div style={{ marginTop: 10 }} className="progress" aria-label="progress">
                <div
                  className="progressFill"
                  style={{ width: `${Math.max(0, Math.min(100, authFlow.percent))}%` }}
                />
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>
                {Math.max(0, Math.min(100, authFlow.percent))}%
              </div>
              <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                {authFlow.steps.map((s, idx) => (
                  <div
                    key={idx}
                    className="row"
                    style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`pill ${s.done ? 'pillGood' : 'pillWarn'}`}>
                        {s.done ? t('authFlow.done') : '...'}
                      </span>
                      <span>{s.label}</span>
                    </div>
                    <span>
                      {s.done
                        ? '100%'
                        : idx === authFlow.step
                          ? `${Math.max(0, Math.min(100, authFlow.percent))}%`
                          : '0%'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </main>
      <footer role="contentinfo" className="footerVersion">
        v{__APP_VERSION__}
        {__BUILD_ID__ ? ` · ${String(__BUILD_ID__).slice(0, 10)}` : ''}
      </footer>
    </div>
  );
}

function StatusBar({ notice }: { notice: Notice }) {
  const { t } = useTranslation();
  useEffect(() => {
    console.log('[App] StatusBar MOUNTED');
    return () => console.log('[App] StatusBar UNMOUNTED');
  }, []);
  console.log(
    `[App] StatusBar render: visible=${notice.visible} level=${notice.level} msg=${notice.message}`
  );
  const cls =
    notice.level === 'ok'
      ? 'statusBar statusBarOk'
      : notice.level === 'warn'
        ? 'statusBar statusBarWarn'
        : 'statusBar statusBarErr';
  const icon = notice.level === 'ok' ? '✓' : notice.level === 'warn' ? '!' : '×';
  return (
    <div
      className={`${cls} ${notice.visible ? 'statusBarVisible' : ''}`}
      role="status"
      aria-live="polite"
      data-testid="status-bar"
    >
      <div className="statusBarIcon">{icon}</div>
      <div className="statusBarText">{notice.message}</div>
    </div>
  );
}

function SalesTrend() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<SalesStats | null>(null);

  useEffect(() => {
    Api.salesStats(14)
      .then((res) => setStats(res))
      .catch(console.error);
  }, []);

  if (!stats || stats.stats.length < 2) {
    return (
      <div
        style={{
          height: 160,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--muted)',
          fontSize: 12,
        }}
      >
        {t('analytics.collecting')}
      </div>
    );
  }

  const maxTotal = Math.max(...stats.stats.map((s) => s.total), 1);
  const width = 600;
  const height = 160;
  const padding = 20;

  const points = stats.stats
    .map((s, i) => {
      const x = padding + (i / (stats.stats.length - 1)) * (width - 2 * padding);
      const y = height - padding - (s.total / maxTotal) * (height - 2 * padding);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="card cardFull glass" style={{ marginTop: 20 }}>
      <div className="flex justify-between items-center mb-4">
        <div style={{ fontWeight: 800 }}>{t('analytics.revenueTrend')}</div>
        <div className="pill pillGood">
          +
          {Math.round(
            (stats.stats[stats.stats.length - 1].total / (stats.stats[0].total || 1) - 1) * 100
          )}
          %
        </div>
      </div>
      <div style={{ height: height, position: 'relative' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height="100%"
          style={{ overflow: 'visible' }}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="chartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 0.3 }} />
              <stop offset="100%" style={{ stopColor: '#3b82f6', stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          <path
            d={`M ${padding},${height} L ${points} L ${width - padding},${height} Z`}
            fill="url(#chartGrad)"
          />
          <polyline
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
          {stats.stats.map((s, i) => {
            const x = padding + (i / (stats.stats.length - 1)) * (width - 2 * padding);
            const y = height - padding - (s.total / maxTotal) * (height - 2 * padding);
            return (
              <g key={i} className="chart-dot-group">
                <circle cx={x} cy={y} r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
                <title>
                  {s.day}: {s.total} ₽
                </title>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex justify-between text-[10px] text-muted mt-2 uppercase font-bold px-2">
        <span>{stats.stats[0].day}</span>
        <span>{stats.stats[stats.stats.length - 1].day}</span>
      </div>
    </div>
  );
}

function DashboardView({
  dash,
  reload,
  onNavigate,
}: {
  dash: Dashboard | null;
  reload: () => Promise<void>;
  onNavigate: (tab: string, params?: Record<string, string | number>) => void;
}) {
  const { t } = useTranslation();
  const { data, loading, error, refresh } = useDashboard();

  // Use DashboardWrapper for role-based rendering
  // The wrapper handles role detection and renders the appropriate dashboard
  return <DashboardWrapper data={data} onNavigate={onNavigate} />;
}

function CustomersView(props: {
  q: string;
  setQ: (s: string) => void;
  customers: CustomerListItem[];
  select: (id: number) => void;
  selected: CustomerListItem | null;
  details: CustomerDetails | null;
  search: () => Promise<void>;
  refresh: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const { q, setQ, customers, select, selected, details, search, refresh } = props;

  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [newCustomer, setNewCustomer] = React.useState({ full_name: '', phone: '', notes: '' });
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);

  async function createCustomer() {
    if (!newCustomer.full_name) {
      setNotice(t('clients.fullNameRequiredError'));
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      await Api.createCustomer(newCustomer);
      setNotice(t('clients.customerCreated'));
      setShowCreateForm(false);
      setNewCustomer({ full_name: '', phone: '', notes: '' });
      await refresh();
    } catch (e: any) {
      setNotice(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  function copyQrToken() {
    if (details?.customer.qr_token) {
      navigator.clipboard.writeText(details.customer.qr_token);
      setNotice(t('clients.qrTokenCopied'));
      setTimeout(() => setNotice(null), 2000);
    }
  }

  return (
    <div className="grid">
      <div className="card cardFull" data-testid="customers_view_en">
        <div className="row">
          <div style={{ width: '100%', maxWidth: 520 }}>
            <input
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('clients.searchByPhoneOrName')}
              data-testid="admin_input_customer_search_en"
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btnPrimary"
              onClick={() => void search()}
              data-testid="admin_btn_customer_search_en"
            >
              {t('clients.searchButton')}
            </button>
            <button
              className="btn"
              onClick={() => void refresh()}
              data-testid="admin_btn_customer_reset_en"
            >
              {t('common.refresh')}
            </button>
            <button
              className="btn btnPrimary"
              onClick={() => setShowCreateForm(true)}
              data-testid="admin_btn_new_customer_en"
            >
              {t('clients.newClient')}
            </button>
          </div>
        </div>
      </div>

      {showCreateForm ? (
        <div className="card cardFull" data-testid="customers_create_form_en">
          <div className="row">
            <div style={{ fontWeight: 900, fontSize: 18 }}>{t('clients.createClient')}</div>
            <button
              className="btn"
              onClick={() => setShowCreateForm(false)}
              data-testid="admin_btn_close_create_form_en"
            >
              {t('common.close')}
            </button>
          </div>
          <div style={{ display: 'grid', gap: 10, marginTop: 12, maxWidth: 600 }}>
            <div>
              <div style={{ marginBottom: 6, fontWeight: 600 }}>
                {t('clients.fullNameRequired')}
              </div>
              <input
                className="input"
                value={newCustomer.full_name}
                onChange={(e) => setNewCustomer((p) => ({ ...p, full_name: e.target.value }))}
                placeholder={t('clients.fullNamePlaceholder')}
                data-testid="admin_input_customer_fullname_en"
              />
            </div>
            <div>
              <div style={{ marginBottom: 6, fontWeight: 600 }}>{t('clients.clientPhone')}</div>
              <input
                className="input"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer((p) => ({ ...p, phone: e.target.value }))}
                placeholder={t('clients.phonePlaceholder')}
                data-testid="admin_input_customer_phone_en"
              />
            </div>
            <div>
              <div style={{ marginBottom: 6, fontWeight: 600 }}>{t('clients.notes')}</div>
              <textarea
                className="input"
                value={newCustomer.notes}
                onChange={(e) => setNewCustomer((p) => ({ ...p, notes: e.target.value }))}
                placeholder={t('clients.notesPlaceholder')}
                rows={3}
                data-testid="admin_input_customer_notes_en"
              />
            </div>
            {notice && (
              <div
                style={{
                  color:
                    notice.includes('успешно') || notice.includes('success')
                      ? '#047857'
                      : '#b91c1c',
                }}
              >
                {notice}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btnPrimary"
                onClick={createCustomer}
                disabled={busy}
                data-testid="admin_btn_create_customer_en"
              >
                {t('common.create')}
              </button>
              <button
                className="btn"
                onClick={() => setShowCreateForm(false)}
                data-testid="admin_btn_cancel_create_en"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="card cardWide">
        <div style={{ fontWeight: 800, marginBottom: 10 }}>{t('clients.customerList')}</div>
        <table className="table">
          <thead>
            <tr>
              <th>{t('table.id')}</th>
              <th>{t('table.phone')}</th>
              <th>{t('table.fullName')}</th>
              <th>{t('table.balance')}</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr
                key={c.id}
                style={{
                  cursor: 'pointer',
                  background: selected?.id === c.id ? 'rgba(0,0,0,0.06)' : 'transparent',
                }}
                onClick={() => select(c.id)}
              >
                <td>{c.id}</td>
                <td>{c.phone || '—'}</td>
                <td>{c.full_name || '—'}</td>
                <td>
                  <span className="pill">{c.balance_points}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card cardWide">
        <div style={{ fontWeight: 800, marginBottom: 10 }}>{t('clients.customerCard')}</div>
        {!details ? (
          <div style={{ color: 'rgba(0,0,0,0.55)' }}>{t('clients.selectCustomer')}</div>
        ) : (
          <div>
            <div className="row" style={{ marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900 }}>
                  {details.customer.full_name || t('clients.noName')}
                </div>
                <div style={{ color: 'rgba(0,0,0,0.55)', marginTop: 6 }}>
                  {details.customer.phone || '—'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="pill pillGood">
                  {t('clients.balanceLabel')} {details.customer.balance_points}
                </div>
                <div style={{ color: 'rgba(0,0,0,0.55)', fontSize: 12, marginTop: 6 }}>
                  {t('clients.telegramId')}: {details.customer.telegram_id || '—'}
                </div>
                {details.customer.qr_token && (
                  <button
                    className="btn"
                    style={{ marginTop: 8, fontSize: 12, padding: '4px 8px' }}
                    onClick={copyQrToken}
                    data-testid="admin_btn_copy_qr_en"
                  >
                    📋 {t('clients.copyQR')}
                  </button>
                )}
              </div>
            </div>

            {notice && <div style={{ color: '#047857', marginBottom: 10 }}>{notice}</div>}

            <div style={{ marginTop: 10, fontWeight: 800 }}>
              {t('clients.transactionHistory')}
              {details.transactions.length > 0 && (
                <span style={{ fontWeight: 400, color: 'var(--muted)', marginLeft: 8 }}>
                  ({details.transactions.length}{' '}
                  {details.transactions.length === 1
                    ? t('clients.purchase')
                    : details.transactions.length < 5
                      ? t('clients.purchases')
                      : t('clients.purchasesGen')}
                  )
                </span>
              )}
            </div>
            <table className="table" style={{ marginTop: 8 }}>
              <thead>
                <tr>
                  <th>{t('table.id')}</th>
                  <th>{t('clients.date')}</th>
                  <th>{t('clients.items')}</th>
                  <th>{t('clients.amount')}</th>
                  <th>{t('clients.writtenOff')}</th>
                  <th>{t('clients.accrued')}</th>
                  <th>{t('clients.document')}</th>
                </tr>
              </thead>
              <tbody>
                {details.transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <a
                        href={`#orders?order=${tx.id}`}
                        style={{
                          cursor: 'pointer',
                          color: 'var(--primary)',
                          textDecoration: 'underline',
                        }}
                        title={t('clients.openOrderDetails')}
                      >
                        #{tx.id}
                      </a>
                    </td>
                    <td>{tx.created_at}</td>
                    <td
                      style={{
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {tx.items && tx.items.length > 0
                        ? tx.items.map((i) => i.name).join(', ')
                        : '—'}
                    </td>
                    <td>{money(tx.total_amount)} ₽</td>
                    <td>{tx.bonus_used}</td>
                    <td>{tx.bonus_earned}</td>
                    <td>
                      <a href={Api.receiptUrl(tx.id)} target="_blank" rel="noreferrer">
                        {t('clients.receiptPDF')}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductsView(props: {
  items: Array<{
    id: number;
    code: string;
    name: string;
    kind: string;
    price: number;
    active: boolean;
  }>;
  reload: () => Promise<void>;
  canEdit: boolean;
  create: (p: {
    code: string;
    name: string;
    kind: string;
    price: number;
    active: boolean;
  }) => Promise<void>;
  setShowProductImport?: (show: boolean) => void;
}) {
  const { t } = useTranslation();
  const { items, reload, canEdit, create, setShowProductImport } = props;
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [kind, setKind] = useState('goods');
  const [price, setPrice] = useState(0);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onCreate() {
    setBusy(true);
    setInfo(null);
    try {
      await create({
        code: code.trim(),
        name: name.trim(),
        kind: kind.trim(),
        price: Math.max(0, Number(price || 0)),
        active: true,
      });
      setCode('');
      setName('');
      setPrice(0);
      setInfo(t('products.created'));
    } catch (e: any) {
      setInfo(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid">
      <div className="card cardFull" data-testid="products_view_en">
        <div className="row">
          <div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>{t('products.productsServices')}</div>
            <div style={{ color: 'rgba(0,0,0,0.55)', fontSize: 13, marginTop: 6 }}>
              {t('products.catalogDescription')}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn"
              onClick={() => void reload()}
              disabled={busy}
              data-testid="admin_btn_products_reload_en"
            >
              {t('common.refresh')}
            </button>
            {canEdit && (
              <button
                className="btn btnPrimary"
                onClick={() => setShowProductImport?.(true)}
                data-testid="admin_btn_products_import_en"
              >
                {t('common.import')}
              </button>
            )}
          </div>
        </div>
      </div>

      {canEdit ? (
        <div className="card cardFull" data-testid="products_create_form_en">
          <div className="row">
            <div style={{ flex: 1 }}>
              <input
                className="input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t('products.productCodePlaceholder')}
                data-testid="admin_input_product_code_en"
              />
            </div>
            <div style={{ flex: 2 }}>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('products.productNamePlaceholder')}
                data-testid="admin_input_product_name_en"
              />
            </div>
            <div style={{ width: 160 }}>
              <input
                className="input"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                placeholder={t('products.productKindPlaceholder')}
                data-testid="admin_input_product_kind_en"
              />
            </div>
            <div style={{ width: 140 }}>
              <input
                className="input"
                value={price}
                onChange={(e) => setPrice(Math.max(0, Number(e.target.value || 0)))}
                placeholder={t('products.productPrice')}
                data-testid="admin_input_product_price_en"
              />
            </div>
            <button
              className="btn btnPrimary"
              disabled={busy || !code.trim() || !name.trim()}
              onClick={() => void onCreate()}
              data-testid="admin_btn_create_product_en"
            >
              {t('common.create')}
            </button>
          </div>
          {info ? <div style={{ marginTop: 10, color: 'rgba(0,0,0,0.65)' }}>{info}</div> : null}
        </div>
      ) : (
        <div className="card cardFull" style={{ color: 'rgba(0,0,0,0.55)' }}>
          {t('products.noEditRights')}
        </div>
      )}

      <div className="card cardFull">
        <div style={{ fontWeight: 800, marginBottom: 10 }}>{t('products.list')}</div>
        <table className="table">
          <thead>
            <tr>
              <th>{t('table.id')}</th>
              <th>{t('products.productCode')}</th>
              <th>{t('products.productName')}</th>
              <th>{t('products.productKind')}</th>
              <th>{t('products.productPrice')}</th>
              <th>{t('products.active')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.code}</td>
                <td>{p.name}</td>
                <td>{p.kind}</td>
                <td>{money(p.price)} ₽</td>
                <td>
                  <span className={`pill ${p.active ? 'pillGood' : 'pillWarn'}`}>
                    {p.active ? t('common.yesShort') : t('common.noShort')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PosView(props: {
  refreshCustomers: () => Promise<void>;
  onSaleDone: (customerId: number) => Promise<void>;
  products: Array<{
    id: number;
    code: string;
    name: string;
    kind: string;
    price: number;
    active: boolean;
  }>;
  reloadProducts: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const { refreshCustomers, onSaleDone, products, reloadProducts } = props;

  const [mode, setMode] = useState<'phone' | 'qr' | 'name'>('phone');
  const [input, setInput] = useState('');
  const [found, setFound] = useState<number | null>(null);
  const [items, setItems] = useState<
    Array<{ code: string; name: string; price: number; qty: number }>
  >([
    { code: 'COFFEE', name: t('products.cappuccino'), price: 240, qty: 1 },
    { code: 'DESSERT', name: t('products.cheesecake'), price: 190, qty: 1 },
  ]);
  const [productPick, setProductPick] = useState<number | ''>('');
  const [bonus, setBonus] = useState(50);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const total = useMemo(() => items.reduce((a, b) => a + b.price * b.qty, 0), [items]);

  async function identify() {
    setInfo(null);
    setFound(null);
    setBusy(true);
    try {
      if (mode === 'phone') {
        const r = await Api.identifyPhone(input);
        setFound(r.customer_id);
      } else if (mode === 'qr') {
        const r = await Api.identifyQr(input);
        setFound(r.customer_id);
      } else {
        const r = await Api.identifyName(input);
        if (r.items.length === 1) {
          setFound(r.items[0].id);
        } else {
          setInfo(`${t('sales.found')}: ${r.items.length}. ${t('sales.refineSearch')}`);
        }
      }
      await refreshCustomers();
    } catch (e: any) {
      setInfo(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function sale() {
    if (!found) return;
    setBusy(true);
    setInfo(null);
    try {
      const res = await Api.createSale({ customer_id: found, items, requested_bonus: bonus });
      setInfo(
        `${t('sales.operationComplete')} ${t('sales.bonusUsed')} ${res.bonus_used}, ${t('sales.bonusEarned')} ${res.bonus_earned}, ${t('sales.balance')} ${res.balance}.`
      );
      await onSaleDone(found);
    } catch (e: any) {
      setInfo(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid">
      <div className="card cardFull" data-testid="pos_view_en">
        <div className="row">
          <div style={{ fontWeight: 900, fontSize: 18 }}>{t('sales.saleOperation')}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`btn ${mode === 'phone' ? 'btnPrimary' : ''}`}
              onClick={() => setMode('phone')}
              data-testid="operator_btn_mode_phone_en"
            >
              {t('sales.identifyByPhone')}
            </button>
            <button
              className={`btn ${mode === 'name' ? 'btnPrimary' : ''}`}
              onClick={() => setMode('name')}
              data-testid="operator_btn_mode_name_en"
            >
              {t('sales.identifyByName')}
            </button>
            <button
              className={`btn ${mode === 'qr' ? 'btnPrimary' : ''}`}
              onClick={() => setMode('qr')}
              data-testid="operator_btn_mode_qr_en"
            >
              {t('sales.identifyByQR')}
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px' }}>
            <input
              className="input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                mode === 'phone'
                  ? t('clients.phonePlaceholder')
                  : mode === 'qr'
                    ? t('pos.qrToken')
                    : t('clients.fullNamePlaceholder')
              }
              data-testid="operator_input_identify_en"
            />
          </div>
          <button
            className="btn btnPrimary"
            disabled={busy}
            onClick={() => void identify()}
            data-testid="operator_btn_identify_en"
          >
            {t('sales.identify')}
          </button>
          <div className="pill">
            {t('sales.customer')}: {found || '—'}
          </div>
        </div>
        {info ? <div style={{ marginTop: 10, color: 'rgba(0,0,0,0.65)' }}>{info}</div> : null}
      </div>

      <div className="card cardWide" data-testid="pos_catalog_en">
        <div className="row" style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 800 }}>{t('sales.catalog')}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn"
              disabled={busy}
              onClick={() => void reloadProducts()}
              data-testid="operator_btn_reload_products_en"
            >
              {t('common.refresh')}
            </button>
          </div>
        </div>
        <div className="row">
          <select
            className="input"
            value={productPick}
            onChange={(e) => setProductPick((e.target.value ? Number(e.target.value) : '') as any)}
            style={{ maxWidth: 520 }}
            data-testid="operator_select_product_en"
          >
            <option value="">{t('sales.selectProduct')}</option>
            {products
              .filter((p) => p.active)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} · {p.name} · {money(p.price)} ₽
                </option>
              ))}
          </select>
          <button
            className="btn btnPrimary"
            disabled={busy || !productPick}
            onClick={() => {
              const p = products.find((x) => x.id === Number(productPick));
              if (!p) return;
              setItems((prev) => {
                const idx = prev.findIndex((it) => it.code === p.code);
                if (idx >= 0) {
                  return prev.map((it, i) => (i === idx ? { ...it, qty: it.qty + 1 } : it));
                }
                return [{ code: p.code, name: p.name, price: p.price, qty: 1 }, ...prev];
              });
              setProductPick('');
            }}
            data-testid="operator_btn_add_to_cart_en"
          >
            {t('sales.addToReceipt')}
          </button>
        </div>
      </div>

      <div className="card cardWide" data-testid="pos_cart_en">
        <div style={{ fontWeight: 800, marginBottom: 10 }}>{t('sales.cart')}</div>
        <table className="table" data-testid="cart-table">
          <thead>
            <tr>
              <th>{t('products.productCode')}</th>
              <th>{t('products.productName')}</th>
              <th>{t('products.productPrice')}</th>
              <th>{t('pos.quantity')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx} data-testid={`cart-item-${it.code}`}>
                <td data-testid={`cart-item-code-${it.code}`}>{it.code}</td>
                <td>{it.name}</td>
                <td>{money(it.price)} ₽</td>
                <td>
                  <input
                    className="input"
                    style={{ width: 90, padding: '8px 10px' }}
                    value={it.qty}
                    onChange={(e) => {
                      const v = Math.max(1, Number(e.target.value || 1));
                      setItems((prev) => prev.map((p, i) => (i === idx ? { ...p, qty: v } : p)));
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card cardWide" data-testid="pos_loyalty_en">
        <div style={{ fontWeight: 800, marginBottom: 10 }}>{t('sales.loyalty')}</div>
        <div className="row" style={{ marginBottom: 10 }}>
          <div className="pill">
            {t('sales.total')} {money(total)} ₽
          </div>
          <div className="pill pillWarn">
            {t('sales.writeoff')} {bonus}
          </div>
        </div>
        <input
          className="input"
          value={bonus}
          onChange={(e) => setBonus(Math.max(0, Number(e.target.value || 0)))}
          data-testid="operator_input_bonus_en"
        />
        <button
          className="btn btnPrimary"
          style={{ marginTop: 12, width: '100%' }}
          disabled={!found || busy}
          onClick={() => void sale()}
          data-testid="operator_btn_complete_sale_en"
        >
          {t('sales.complete')}
        </button>
        <div style={{ marginTop: 10, color: 'rgba(0,0,0,0.55)', fontSize: 12 }}>
          {t('sales.receiptSaved')}
        </div>
      </div>
    </div>
  );
}

function IntegrationsView(props: {
  items: Integration[];
  templates: IntegrationTemplate[];
  busy: boolean;
  selected: Integration | null;
  deliveries: IntegrationDelivery[];
  select: (id: number) => void;
  reload: () => Promise<void>;
  create: (p: { name: string; kind: string; enabled: boolean; config: any }) => Promise<void>;
  update: (
    id: number,
    p: { name: string; kind: string; enabled: boolean; config: any }
  ) => Promise<void>;
  rotate: (id: number) => Promise<void>;
  remove: (id: number) => Promise<void>;
  refreshDeliveries: (id: number) => Promise<void>;
}) {
  const { t } = useTranslation();
  const {
    items,
    templates,
    busy,
    selected,
    deliveries,
    select,
    reload,
    create,
    update,
    rotate,
    remove,
    refreshDeliveries,
  } = props;

  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [templateId, setTemplateId] = useState('');
  const [name, setName] = useState('');
  const [kind, setKind] = useState('pos_webhook');
  const [enabled, setEnabled] = useState(true);
  const [configText, setConfigText] = useState('{}');
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!selected) return;
    setMode('edit');
    setTemplateId('');
    setName(selected.name);
    setKind(selected.kind);
    setEnabled(selected.enabled);
    setConfigText(JSON.stringify(selected.config || {}, null, 2));
  }, [selected?.id]);

  useEffect(() => {
    if (!templateId) return;
    const t = templates.find((x) => x.id === templateId);
    if (!t) return;
    setMode('create');
    setName(t.name);
    setKind(t.kind);
    setEnabled(true);
    setConfigText(JSON.stringify(t.config || {}, null, 2));
  }, [templateId]);

  function parseConfig(): any {
    const t = (configText || '').trim();
    if (!t) return {};
    return JSON.parse(t);
  }

  async function copyWithAutoClear(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setInfo(t('common.copied'));
      window.setTimeout(async () => {
        try {
          const current = await navigator.clipboard.readText();
          if (current === text) {
            await navigator.clipboard.writeText('');
          }
        } catch {}
      }, 12000);
    } catch {
      setInfo(t('common.copyFailed'));
    }
  }

  async function onSave() {
    setInfo(null);
    try {
      const cfg = parseConfig();
      if (mode === 'create') {
        await create({ name: name.trim(), kind: kind.trim(), enabled, config: cfg });
        setName('');
        setKind('pos_webhook');
        setEnabled(true);
        setConfigText('{}');
        setInfo(t('integrations.integrationCreated'));
      } else if (mode === 'edit' && selected) {
        await update(selected.id, { name: name.trim(), kind: kind.trim(), enabled, config: cfg });
        setInfo(t('integrations.changesSaved'));
      }
    } catch (e: any) {
      setInfo(String(e?.message || e));
    }
  }

  const webhookUrl = selected
    ? `${location.origin}/api/v1/public/integrations/${selected.id}/pos/receipt`
    : '';

  return (
    <div className="grid">
      <div className="card cardWide">
        <div className="row" style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 800 }}>{t('integrations.connections')}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" disabled={busy} onClick={() => void reload()}>
              {t('common.refresh')}
            </button>
          </div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>{t('table.id')}</th>
              <th>{t('integrations.name')}</th>
              <th>{t('integrations.type')}</th>
              <th>{t('integrations.status')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr
                key={i.id}
                style={{
                  cursor: 'pointer',
                  background: selected?.id === i.id ? 'rgba(0,0,0,0.04)' : 'transparent',
                }}
                onClick={() => select(i.id)}
              >
                <td>{i.id}</td>
                <td>{i.name}</td>
                <td>{i.kind}</td>
                <td>
                  <span className={`pill ${i.enabled ? 'pillGood' : 'pillWarn'}`}>
                    {i.enabled ? t('common.enabled') : t('common.disabled')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 10, color: 'rgba(0,0,0,0.55)', fontSize: 12 }}>
          {t('integrations.integrationTypes')}
        </div>
      </div>

      <div className="card cardWide">
        <div className="row" style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 800 }}>
            {mode === 'create' ? t('integrations.createNew') : t('integrations.settingsTitle')}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`btn ${mode === 'create' ? 'btnPrimary' : ''}`}
              onClick={() => setMode('create')}
            >
              {t('integrations.newIntegration')}
            </button>
            <button
              className={`btn ${mode === 'edit' ? 'btnPrimary' : ''}`}
              disabled={!selected}
              onClick={() => setMode('edit')}
            >
              {t('integrations.editIntegration')}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          {mode === 'create' ? (
            <div>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', marginBottom: 6 }}>
                {t('integrations.template')}
              </div>
              <select
                className="input"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                <option value="">{t('integrations.noTemplate')}</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.region} · {t.name}
                  </option>
                ))}
              </select>
              <div style={{ color: 'rgba(0,0,0,0.55)', fontSize: 12, marginTop: 6 }}>
                {templateId
                  ? templates.find((t) => t.id === templateId)?.description
                  : t('integrations.selectTemplate')}
              </div>
            </div>
          ) : null}
          <div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', marginBottom: 6 }}>
              {t('integrations.name')}
            </div>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="row">
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', marginBottom: 6 }}>
                {t('integrations.type')}
              </div>
              <input className="input" value={kind} onChange={(e) => setKind(e.target.value)} />
            </div>
            <div style={{ width: 180 }}>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', marginBottom: 6 }}>
                {t('integrations.status')}
              </div>
              <button
                className={`btn ${enabled ? 'btnPrimary' : ''}`}
                onClick={() => setEnabled((v) => !v)}
              >
                {enabled ? t('common.enabled') : t('common.disabled')}
              </button>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', marginBottom: 6 }}>
              {t('integrations.configuration')}
            </div>
            <textarea
              className="input"
              style={{ height: 160, resize: 'vertical' }}
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
            />
          </div>

          <div className="row">
            <button
              className="btn btnPrimary"
              onClick={() => void onSave()}
              disabled={!name.trim() || !kind.trim()}
            >
              {t('common.save')}
            </button>
            {mode === 'edit' && selected ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" onClick={() => void rotate(selected.id)}>
                  {t('integrations.copyKey')}
                </button>
                <button className="btn" onClick={() => void remove(selected.id)}>
                  {t('common.delete')}
                </button>
              </div>
            ) : (
              <div />
            )}
          </div>

          {info ? (
            <div
              style={{
                color: info.toLowerCase().includes('error') ? '#8b0000' : 'rgba(0,0,0,0.75)',
              }}
            >
              {info}
            </div>
          ) : null}

          {selected && selected.kind === 'pos_webhook' ? (
            <div>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', marginBottom: 6 }}>
                {t('integrations.webhookReceipt')}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" readOnly value={webhookUrl} />
                <button
                  className="btn"
                  onClick={() => void copyWithAutoClear(webhookUrl)}
                  type="button"
                >
                  {t('common.copy')}
                </button>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', marginTop: 8 }}>
                {t('integrations.authorizationHeader')}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <input className="input" readOnly value={selected.secret} />
                <button
                  className="btn"
                  onClick={() => void copyWithAutoClear(selected.secret)}
                  type="button"
                >
                  {t('common.copy')}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {selected ? (
        <div className="card cardFull">
          <div className="row">
            <div style={{ fontWeight: 800 }}>{t('integrations.eventDelivery')}</div>
            <button className="btn" onClick={() => void refreshDeliveries(selected.id)}>
              {t('common.refresh')}
            </button>
          </div>
          <table className="table" style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>{t('table.id')}</th>
                <th>{t('integrations.event')}</th>
                <th>{t('integrations.status')}</th>
                <th>HTTP</th>
                <th>{t('clients.date')}</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => (
                <tr key={d.id}>
                  <td>{d.id}</td>
                  <td>{d.event_type}</td>
                  <td>
                    <span className={`pill ${d.status === 'ok' ? 'pillGood' : 'pillWarn'}`}>
                      {d.status}
                    </span>
                  </td>
                  <td>{d.http_status ?? '—'}</td>
                  <td>{d.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 10, color: 'rgba(0,0,0,0.55)', fontSize: 12 }}>
            {t('integrations.outboundConfig')}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PermissionsTable() {
  const { t } = useTranslation();

  // Role label helper
  function roleLabel(role: string) {
    const r = String(role || '').toLowerCase();
    if (r === 'owner') return t('roles.owner');
    if (r === 'operator') return t('roles.operator');
    if (r === 'marketer') return t('roles.marketer');
    return r || '—';
  }

  const [data, setData] = useState<{
    items: Array<{ role: string; permissions: Array<{ permission: string; is_allowed: boolean }> }>;
    all_permissions: string[];
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await Api.permissions();
      // Transform flat list to grouped structure if needed
      if (
        res.items &&
        Array.isArray(res.items) &&
        res.items.length > 0 &&
        (res.items[0] as any).permission
      ) {
        // Flat list format from API: [{role, permission, is_allowed}, ...]
        const all_permissions = [...new Set(res.items.map((item: any) => item.permission))];
        // Restructure to expected format
        const roleMap: any = {};
        res.items.forEach((item: any) => {
          if (!roleMap[item.role]) {
            roleMap[item.role] = { role: item.role, permissions: [] };
          }
          roleMap[item.role].permissions.push({
            permission: item.permission,
            is_allowed: item.is_allowed,
          });
        });
        setData({ items: Object.values(roleMap), all_permissions });
      } else {
        // Already in expected format
        setData(res);
      }
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(role: string, perm: string, current: boolean) {
    if (busy) return;
    const next = !current;
    // Optimistic update
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((r) => {
          if (r.role !== role) return r;
          return {
            ...r,
            permissions: r.permissions.map((p) =>
              p.permission === perm ? { ...p, is_allowed: next } : p
            ),
          };
        }),
      };
    });

    try {
      await Api.updatePermission(role, perm, next);
    } catch (e: any) {
      setError(String(e?.message || e));
      await load(); // Revert
    }
  }

  if (!data) return <div style={{ padding: 20 }}>{t('settings.loadPermissions')}</div>;

  return (
    <div className="card cardFull">
      <div className="row">
        <div style={{ fontWeight: 800 }}>{t('settings.accessManagement')}</div>
        <button className="btn" onClick={() => void load()} disabled={busy}>
          {t('common.refresh')}
        </button>
      </div>
      <div style={{ overflowX: 'auto', marginTop: 12 }}>
        <table className="table">
          <thead>
            <tr>
              <th>{t('settings.permission')}</th>
              {data.items.map((r) => (
                <th key={r.role} style={{ textAlign: 'center' }}>
                  {roleLabel(r.role)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.all_permissions.map((perm) => (
              <tr key={perm}>
                <td style={{ fontSize: 13, fontFamily: 'monospace', color: '#555' }}>{perm}</td>
                {data.items.map((roleGroup) => {
                  const p = roleGroup.permissions.find((x) => x.permission === perm);
                  const allowed = p?.is_allowed || false;
                  const isOwner = roleGroup.role === 'owner';
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
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error ? <div style={{ marginTop: 10, color: '#8b0000' }}>{error}</div> : null}
    </div>
  );
}

export default App;
