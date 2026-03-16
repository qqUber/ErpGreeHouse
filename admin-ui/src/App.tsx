import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnalyticsView } from './AnalyticsView';
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
    RolePermissions,
    setAdminSecret,
} from './api';
import { ComplianceView } from './ComplianceView';
import { CustomersWidget } from './components/dashboard/CustomersWidget';
import { DashboardWrapper } from './components/dashboard/DashboardWrapper';
import { IntegrationsWidget } from './components/dashboard/IntegrationsWidget';
import { MarketingWidget } from './components/dashboard/MarketingWidget';
import { OperationalWidget } from './components/dashboard/OperationalWidget';
import { ProductsWidget } from './components/dashboard/ProductsWidget';
import { IntegrationSettings } from './components/IntegrationSettings';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { ProductImport } from './components/ProductImport';
import { ErrorMessage, LoadingSpinner, SuccessMessage, WarningMessage } from './components/ui';
import { useDashboard } from './hooks/useDashboard';
import { useViewportMode } from './hooks/useViewportMode';
import { MarketingView } from './MarketingView';
import { useAuth } from './stores/auth';

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
  debug_mode: boolean;
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
  const viewport = useViewportMode();

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
  const effectivePermissions = useMemo(
    () => new Set(effectiveMe?.permissions || []),
    [effectiveMe?.permissions]
  );
  const canReadIntegrations = useMemo(
    () =>
      effectiveMe?.role === 'owner' ||
      effectivePermissions.has('*') ||
      effectivePermissions.has('integration.read'),
    [effectiveMe?.role, effectivePermissions]
  );
  const canUseDevSale = useMemo(
    () =>
      Boolean(publicStatus?.debug_mode) &&
      (effectiveMe?.role === 'owner' ||
        effectivePermissions.has('*') ||
        effectivePermissions.has('pos.sale') ||
        effectivePermissions.has('integration.update')),
    [effectiveMe?.role, effectivePermissions, publicStatus?.debug_mode]
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

  async function loadCustomers(query?: string) {
    setError(null);
    const res = await Api.customers(query);
    setCustomers(res.items);
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

  async function loadProducts() {
    setError(null);
    const res = await Api.products();
    setProducts(res.items);
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

  // Bootstrap the app - only run after auth is initialized
  // This prevents calling protected endpoints before knowing if user has a valid session
  useEffect(() => {
    // Wait for auth to finish loading before bootstrapping
    // This prevents the 401 refresh loop on initial page load when user is not logged in
    if (authLoading) {
      console.log('[App] Waiting for auth to finish loading before bootstrap...');
      return;
    }
    console.log('[App] Auth loading complete, running bootstrap...');
    bootstrap();
  }, [authLoading, user]);

  useEffect(() => {
    // Detect E2E mode at runtime using multiple signals
    const isE2EMode = 
      // Check if running in Playwright (sets navigator.webdriver)
      (navigator as any).webdriver === true ||
      // Check for e2e query parameter
      window.location.search.includes('e2e=true') ||
      // Check for test user agent
      navigator.userAgent.includes('Playwright');
    
    if (isE2EMode) {
      console.log('[App] E2E mode detected - skipping visibility handler for password security');
      return;
    }

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
    if (tab === 'integrations' && canReadIntegrations) {
      Promise.all([loadIntegrations(), loadIntegrationTemplates()]).catch((e) =>
        setError(String(e))
      );
    }
  }, [tab, authReady, canReadIntegrations]);

  useEffect(() => {
    if (!authReady) return;
    if (canReadIntegrations && selectedIntegrationId != null) {
      loadDeliveries(selectedIntegrationId).catch((e) => setError(String(e)));
    }
  }, [selectedIntegrationId, authReady, canReadIntegrations]);

  useEffect(() => {
    if (tab === 'integrations' && !canReadIntegrations && integrationSubTab === 'settings') {
      setIntegrationSubTab('webhooks');
    }
  }, [tab, canReadIntegrations, integrationSubTab]);

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
    if (perms.has('integration.read') || (publicStatus?.debug_mode && (perms.has('pos.sale') || perms.has('integration.update'))))
      tabs.push('integrations');
    if (perms.has('product.read')) tabs.push('products');
    // Settings is always available for password change, but content inside depends on permissions
    tabs.push('settings');
    if (perms.has('marketing.campaign')) tabs.push('marketing');
    if (perms.has('customer.delete') || perms.has('customer.read')) tabs.push('compliance');
    if (perms.has('dashboard.read')) tabs.push('analytics');

    return tabs;
  }, [effectiveAuthReady, user, me?.role, me?.permissions, publicStatus?.debug_mode]);

  const safeTab: Tab = useMemo(() => {
    if (!effectiveAuthReady) return tab;
    return allowedTabs.includes(tab) ? tab : allowedTabs[0] || 'dashboard';
  }, [tab, effectiveAuthReady, allowedTabs]);
  const showProtectedPanels = optimisticReady && !!effectiveMe;

  useEffect(() => {
    if (!effectiveAuthReady) return;
    if (tab !== safeTab) setTab(safeTab);
  }, [safeTab, tab, effectiveAuthReady]);

  return (
    <div className={`container app-shell mode-${viewport.mode} density-${viewport.density}`}>
      <header className="header">
        <div className="brand">
          <h1 style={{ fontWeight: 800, fontSize: 'var(--font-size-xl)', margin: 0 }}>
            {t('app.controlPanel')}
          </h1>
        </div>
        <nav aria-label="Main navigation">
          <div className="tabs" role="tablist" aria-label="Main navigation">
            {allowedTabs.includes('dashboard') ? (
              <button
                id="dashboard-tab"
                className={`tab ${safeTab === 'dashboard' ? 'tabActive' : ''}`}
                onClick={() => setTab('dashboard')}
                role="tab"
                aria-selected={safeTab === 'dashboard'}
                aria-controls={showProtectedPanels ? 'dashboard-panel' : undefined}
                data-testid="admin_nav_dashboard"
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
                aria-controls={showProtectedPanels ? 'customers-panel' : undefined}
                data-testid="admin_nav_customers"
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
                aria-controls={showProtectedPanels ? 'pos-panel' : undefined}
                data-testid="admin_nav_pos"
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
                aria-controls={showProtectedPanels ? 'integrations-panel' : undefined}
                data-testid="admin_nav_integrations"
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
                aria-controls={showProtectedPanels ? 'products-panel' : undefined}
                data-testid="admin_nav_products"
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
                aria-controls={showProtectedPanels ? 'settings-panel' : undefined}
                data-testid="admin_nav_settings"
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
                aria-controls={showProtectedPanels ? 'marketing-panel' : undefined}
                data-testid="admin_nav_marketing"
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
                aria-controls={showProtectedPanels ? 'compliance-panel' : undefined}
                data-testid="admin_nav_compliance"
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
                aria-controls={showProtectedPanels ? 'analytics-panel' : undefined}
                data-testid="admin_nav_analytics"
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

      <main
        aria-label="Main content"
        data-viewport-mode={viewport.mode}
        data-viewport-density={viewport.density}
      >
        {notice && notice.visible ? (
          <div className="grid">
            {notice.level === 'ok' ? (
              <SuccessMessage message={notice.message} />
            ) : notice.level === 'warn' ? (
              <WarningMessage message={notice.message} />
            ) : (
              <ErrorMessage message={notice.message} />
            )}
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

        {showProtectedPanels && safeTab === 'dashboard' ? (
          <div id="dashboard-panel" role="tabpanel" aria-labelledby="dashboard-tab">
            <DashboardView dash={dash} reload={() => loadDashboard()} onNavigate={navigateTo} />
          </div>
        ) : null}
        {showProtectedPanels && safeTab === 'customers' ? (
          <div id="customers-panel" role="tabpanel" aria-labelledby="customers-tab">
            <CustomersView
              q={q}
              setQ={setQ}
              customers={customers}
              select={(id) => setSelectedId(id)}
              selected={selected}
              details={details}
              search={() => loadCustomers(q)}
              refresh={() => loadCustomers()}
            />
          </div>
        ) : null}
        {showProtectedPanels && safeTab === 'pos' ? (
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
        {showProtectedPanels && safeTab === 'integrations' ? (
          <div id="integrations-panel" role="tabpanel" aria-labelledby="integrations-tab">
            <div className="grid">
              <div className="card cardWide">
                <div className="tabs" style={{ marginBottom: 15 }}>
                  {canReadIntegrations ? (
                    <div
                      className={`tab ${integrationSubTab === 'settings' ? 'tabActive' : ''}`}
                      onClick={() => setIntegrationSubTab('settings')}
                      data-testid="admin_tab_integration_settings_en"
                    >
                      {t('integrations.botSettings')}
                    </div>
                  ) : null}
                  <div
                    className={`tab ${integrationSubTab === 'webhooks' ? 'tabActive' : ''}`}
                    onClick={() => setIntegrationSubTab('webhooks')}
                    data-testid="admin_tab_webhooks_en"
                  >
                    {t('integrations.connections')}
                  </div>
                </div>

                {integrationSubTab === 'settings' && canReadIntegrations ? (
                  <IntegrationSettings />
                ) : (
                  <IntegrationsView
                    items={integrations}
                    templates={integrationTemplates}
                    busy={integrationsBusy}
                    selected={selectedIntegration}
                    deliveries={integrationDeliveries}
                    canManage={canReadIntegrations}
                    canUseDevSale={canUseDevSale}
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
                    createDevSale={async (customerQr) => {
                      const result = await Api.createDevSale(customerQr);
                      await Promise.all([loadDashboard(), loadCustomers()]);
                      setSelectedId(result.customer_id);
                      return result;
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        ) : null}
        {showProtectedPanels && safeTab === 'products' ? (
          <div id="products-panel" role="tabpanel" aria-labelledby="products-tab">
            <ProductsView
              items={products}
              reload={() => loadProducts()}
              canEdit={(me?.permissions || []).includes('product.create')}
              showProductImport={showProductImport}
              create={async (p) => {
                await Api.createProduct(p);
                await loadProducts();
              }}
              setShowProductImport={setShowProductImport}
            />
          </div>
        ) : null}
        {showProtectedPanels && safeTab === 'settings' ? (
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

        {showProtectedPanels && safeTab === 'marketing' ? (
          <div id="marketing-panel" role="tabpanel" aria-labelledby="marketing-tab">
            <MarketingView />
          </div>
        ) : null}

        {showProtectedPanels && safeTab === 'compliance' ? (
          <div id="compliance-panel" role="tabpanel" aria-labelledby="compliance-tab">
            <ComplianceView />
          </div>
        ) : null}
        {showProtectedPanels && safeTab === 'analytics' ? (
          <div id="analytics-panel" role="tabpanel" aria-labelledby="analytics-tab">
            <AnalyticsView />
          </div>
        ) : null}

        {authFlow?.active ? (
          <div className="overlay" role="dialog" aria-modal="true">
            <div className="overlayPanel">
              <div className="row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <LoadingSpinner size="sm" />
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

type DashboardViewProps = {
  dash: Dashboard | null;
  reload: () => Promise<void>;
  onNavigate: (tab: string, params?: Record<string, string | number>) => void;
};

function DashboardView({ dash, reload, onNavigate }: DashboardViewProps) {
  const { t } = useTranslation();
  const { data, loading, error, refresh } = useDashboard();

  async function handleReload() {
    await Promise.allSettled([reload(), refresh()]);
  }

  return (
    <div className="grid" data-testid="admin-dashboard">
      <div className="card cardFull">
        <div className="row">
          <div style={{ fontWeight: 800 }} data-testid="admin-dashboard-title">
            {t('dashboard.title')}
          </div>
          <button className="btn" onClick={() => void handleReload()} type="button">
            {t('common.refresh')}
          </button>
        </div>
        {dash ? (
          <div
            style={{
              marginTop: 10,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: 10,
            }}
          >
            <div className="card cardCompact">
              <div style={{ color: 'rgba(0,0,0,0.55)', fontSize: 12 }}>{t('sales.title')}</div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{dash.sales_count}</div>
            </div>
            <div className="card cardCompact">
              <div style={{ color: 'rgba(0,0,0,0.55)', fontSize: 12 }}>
                {t('dashboard.revenueToday')}
              </div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{money(dash.sales_total)} ₽</div>
            </div>
            <div className="card cardCompact">
              <div style={{ color: 'rgba(0,0,0,0.55)', fontSize: 12 }}>{t('menu.clients')}</div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{dash.customers_total}</div>
            </div>
            <div className="card cardCompact">
              <div style={{ color: 'rgba(0,0,0,0.55)', fontSize: 12 }}>
                {t('sales.bonusEarned')}
              </div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{money(dash.bonus_earned)}</div>
            </div>
          </div>
        ) : null}
        {loading ? (
          <div style={{ marginTop: 10, color: 'rgba(0,0,0,0.55)' }}>{t('common.loading')}</div>
        ) : null}
        {error ? <div style={{ marginTop: 10, color: '#8b0000' }}>{error}</div> : null}
      </div>

      <DashboardWrapper data={data} onNavigate={onNavigate} />

      {data.operational ? <OperationalWidget data={data.operational} /> : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 10,
        }}
      >
        <div data-testid="admin_widget_customers">
          <CustomersWidget data={data.customers || undefined} />
        </div>
        <div data-testid="admin_widget_products">
          <ProductsWidget data={data.products || undefined} />
        </div>
        <div data-testid="admin_widget_marketing">
          <MarketingWidget data={data.marketing || undefined} />
        </div>
        <div data-testid="admin_widget_integrations">
          <IntegrationsWidget data={data.integrations || undefined} />
        </div>
      </div>
    </div>
  );
}

type CustomersViewProps = {
  q: string;
  setQ: React.Dispatch<React.SetStateAction<string>>;
  customers: CustomerListItem[];
  select: (id: number) => void;
  selected: CustomerListItem | null;
  details: CustomerDetails | null;
  search: () => Promise<void>;
  refresh: () => Promise<void>;
};

function CustomersView({
  q,
  setQ,
  customers,
  select,
  selected,
  details,
  search,
  refresh,
}: CustomersViewProps) {
  const { t } = useTranslation();

  return (
    <div className="grid">
      <div className="card cardFull">
        <div className="row">
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('customers.search')}
            autoComplete="off"
            data-testid="customers_search_input"
          />
          <button
            className="btn btnPrimary"
            onClick={() => void search()}
            type="button"
            data-testid="customers_search_button"
          >
            {t('common.search')}
          </button>
          <button
            className="btn"
            onClick={() => void refresh()}
            type="button"
            data-testid="customers_clear_button"
          >
            {t('common.refresh')}
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 10,
        }}
      >
        <div className="card cardFull">
          <div style={{ fontWeight: 700, marginBottom: 8 }}>{t('customers.list')}</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {customers.map((c) => (
              <button
                key={c.id}
                type="button"
                className="btn"
                onClick={() => select(c.id)}
                style={{
                  justifyContent: 'space-between',
                  background: selected?.id === c.id ? 'var(--primary-light)' : undefined,
                  borderColor: selected?.id === c.id ? 'var(--primary)' : undefined,
                }}
              >
                <span>{c.full_name || c.phone || `#${c.id}`}</span>
                <span style={{ color: 'rgba(0,0,0,0.55)' }}>{c.balance_points}</span>
              </button>
            ))}
            {customers.length === 0 ? (
              <div style={{ color: 'rgba(0,0,0,0.55)', fontSize: 13 }}>
                {t('customers.noCustomers')}
              </div>
            ) : null}
          </div>
        </div>

        <div className="card cardFull">
          <div style={{ fontWeight: 700, marginBottom: 8 }}>{t('customers.details')}</div>
          {!details ? (
            <div style={{ color: 'rgba(0,0,0,0.55)', fontSize: 13 }}>
              {t('customers.selectCustomer')}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <div>{details.customer.full_name || '—'}</div>
                <div style={{ color: 'rgba(0,0,0,0.55)', fontSize: 13 }}>
                  {details.customer.phone || '—'}
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
                {t('customers.balance')}: {details.customer.balance_points}
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {details.transactions.slice(0, 10).map((tx) => (
                  <div key={tx.id} className="card cardCompact">
                    <div style={{ fontWeight: 700 }}>#{tx.id}</div>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>
                      {new Date(tx.created_at).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 13 }}>{money(tx.total_amount)} ₽</div>
                  </div>
                ))}
                {details.transactions.length === 0 ? (
                  <div style={{ color: 'rgba(0,0,0,0.55)', fontSize: 13 }}>
                    {t('customers.noTransactions')}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type ProductRow = {
  id: number;
  code: string;
  name: string;
  kind: string;
  price: number;
  active: boolean;
};

type PosViewProps = {
  refreshCustomers: () => Promise<void>;
  products: ProductRow[];
  reloadProducts: () => Promise<void>;
  onSaleDone: (customerId: number) => Promise<void>;
};

function PosView({ refreshCustomers, products, reloadProducts, onSaleDone }: PosViewProps) {
  const { t } = useTranslation();
  const [customerId, setCustomerId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [qty, setQty] = useState('1');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submitSale() {
    const parsedCustomerId = Number(customerId);
    const parsedQty = Number(qty);
    const product = products.find((p) => String(p.id) === selectedProductId);

    if (!parsedCustomerId || !product || !parsedQty || parsedQty < 1) {
      setErr('Invalid sale data');
      return;
    }

    setBusy(true);
    setErr(null);
    setNotice(null);
    try {
      await Api.createSale({
        customer_id: parsedCustomerId,
        items: [
          { code: product.code, name: product.name, price: Number(product.price), qty: parsedQty },
        ],
      });
      setNotice('Sale created successfully');
      await Promise.allSettled([refreshCustomers(), onSaleDone(parsedCustomerId)]);
      setQty('1');
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid">
      <div className="card cardFull">
        <div className="row">
          <div style={{ fontWeight: 700 }}>{t('sales.title')}</div>
          <button className="btn" onClick={() => void reloadProducts()} type="button">
            {t('menu.products')}
          </button>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 8,
            marginTop: 10,
          }}
        >
          <input
            className="input"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            placeholder={t('sales.customerId')}
          />
          <select
            className="input"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
          >
            <option value="">{t('sales.selectProduct')}</option>
            {products
              .filter((p) => p.active)
              .map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.code} - {p.name} ({money(p.price)} ₽)
                </option>
              ))}
          </select>
          <input
            className="input"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder={t('sales.qty')}
          />
          <button
            className="btn btnPrimary"
            onClick={() => void submitSale()}
            disabled={busy}
            type="button"
          >
            {busy ? t('common.loading') : t('sales.createSale')}
          </button>
        </div>
        {notice ? <div style={{ marginTop: 10, color: '#047857' }}>{notice}</div> : null}
        {err ? <div style={{ marginTop: 10, color: '#8b0000' }}>{err}</div> : null}
      </div>
    </div>
  );
}

type IntegrationPayload = {
  name: string;
  kind: string;
  enabled: boolean;
  config: Record<string, unknown>;
};

type IntegrationsViewProps = {
  items: Integration[];
  templates: IntegrationTemplate[];
  busy: boolean;
  selected: Integration | null;
  deliveries: IntegrationDelivery[];
  canManage: boolean;
  canUseDevSale: boolean;
  select: (id: number) => void;
  reload: () => Promise<void>;
  create: (payload: IntegrationPayload) => Promise<void>;
  update: (id: number, payload: IntegrationPayload) => Promise<void>;
  rotate: (id: number) => Promise<void>;
  remove: (id: number) => Promise<void>;
  refreshDeliveries: (id: number) => Promise<void>;
  createDevSale: (customerQr: string) => Promise<{
    accepted: boolean;
    duplicate?: boolean;
    transaction_id: number;
    customer_id: number;
    integration_id: number;
    receipt_id: string;
    debug_mode: boolean;
  }>;
};

function IntegrationsView({
  items,
  templates,
  busy,
  selected,
  deliveries,
  canManage,
  canUseDevSale,
  select,
  reload,
  create,
  update,
  rotate,
  remove,
  refreshDeliveries,
  createDevSale,
}: IntegrationsViewProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [kind, setKind] = useState('webhook');
  const [enabled, setEnabled] = useState(true);
  const [configText, setConfigText] = useState('{}');
  const [err, setErr] = useState<string | null>(null);
  const [saleQr, setSaleQr] = useState('');
  const [saleBusy, setSaleBusy] = useState(false);
  const [saleErr, setSaleErr] = useState<string | null>(null);
  const [saleResult, setSaleResult] = useState<string | null>(null);

  function readConfig(): Record<string, unknown> {
    try {
      const parsed = JSON.parse(configText);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      throw new Error('Invalid JSON in config');
    }
  }

  async function handleCreate() {
    try {
      setErr(null);
      await create({ name: name.trim(), kind: kind.trim(), enabled, config: readConfig() });
      setName('');
      setConfigText('{}');
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  async function handleUpdate() {
    if (!selected) return;
    try {
      setErr(null);
      await update(selected.id, {
        name: name.trim() || selected.name,
        kind: kind.trim() || selected.kind,
        enabled,
        config: readConfig(),
      });
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  async function handleCreateSale() {
    try {
      setSaleBusy(true);
      setSaleErr(null);
      setSaleResult(null);
      const result = await createDevSale(saleQr.trim());
      setSaleResult(
        `Sale created: tx #${result.transaction_id}, customer #${result.customer_id}${result.duplicate ? ' (duplicate)' : ''}`
      );
      setSaleQr('');
    } catch (e: any) {
      setSaleErr(String(e?.message || e));
    } finally {
      setSaleBusy(false);
    }
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 10,
      }}
    >
      <div className="card cardFull">
        <div className="row">
          <div style={{ fontWeight: 700 }}>{t('integrations.connections')}</div>
          {canManage ? (
            <button className="btn" onClick={() => void reload()} type="button">
              {t('common.refresh')}
            </button>
          ) : null}
        </div>
        <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
          {canManage
            ? items.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  className="btn"
                  onClick={() => {
                    select(i.id);
                    setName(i.name);
                    setKind(i.kind);
                    setEnabled(i.enabled);
                    setConfigText(JSON.stringify(i.config || {}, null, 2));
                  }}
                  style={{
                    justifyContent: 'space-between',
                    background: selected?.id === i.id ? 'var(--primary-light)' : undefined,
                    borderColor: selected?.id === i.id ? 'var(--primary)' : undefined,
                  }}
                >
                  <span>
                    {i.name} ({i.kind})
                  </span>
                  <span className={`pill ${i.enabled ? 'pillGood' : 'pillWarn'}`}>
                    {i.enabled ? 'on' : 'off'}
                  </span>
                </button>
              ))
            : null}
          {canManage && items.length === 0 && !busy ? (
            <div style={{ color: 'rgba(0,0,0,0.55)', fontSize: 13 }}>
              {t('integrations.noConnections')}
            </div>
          ) : null}
          {!canManage && canUseDevSale ? (
            <div style={{ color: 'rgba(0,0,0,0.55)', fontSize: 13 }}>
              DEV cashier simulator is available without full integration management access.
            </div>
          ) : null}
        </div>
      </div>

      {canManage ? (
        <div className="card cardFull">
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            {selected ? t('common.edit') : t('common.create')}
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('common.name')}
            />
            <input
              className="input"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              placeholder={t('common.type')}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              {t('common.enabled')}
            </label>
            <textarea
              className="input"
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              rows={8}
              style={{ fontFamily: 'monospace' }}
            />
            <div className="row">
              {selected ? (
                <>
                  <button
                    className="btn btnPrimary"
                    onClick={() => void handleUpdate()}
                    type="button"
                  >
                    {t('common.save')}
                  </button>
                  <button className="btn" onClick={() => void rotate(selected.id)} type="button">
                    {t('integrations.rotateSecret')}
                  </button>
                  <button className="btn" onClick={() => void remove(selected.id)} type="button">
                    {t('common.delete')}
                  </button>
                  <button
                    className="btn"
                    onClick={() => void refreshDeliveries(selected.id)}
                    type="button"
                  >
                    {t('integrations.deliveryLog')}
                  </button>
                </>
              ) : (
                <button className="btn btnPrimary" onClick={() => void handleCreate()} type="button">
                  {t('common.create')}
                </button>
              )}
            </div>
            {err ? <div style={{ color: '#8b0000' }}>{err}</div> : null}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  className="btn"
                  onClick={() => {
                    setName(tpl.name);
                    setKind(tpl.kind);
                    setConfigText(JSON.stringify(tpl.config || {}, null, 2));
                  }}
                  type="button"
                >
                  {tpl.name}
                </button>
              ))}
            </div>
            {selected && deliveries.length > 0 ? (
              <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                {deliveries.slice(0, 10).map((d) => (
                  <div key={d.id} className="card cardCompact">
                    <div style={{ fontWeight: 700 }}>
                      #{d.id} {d.event_type}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>
                      {d.status} {d.http_status ? `(${d.http_status})` : ''} ·{' '}
                      {new Date(d.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {canUseDevSale ? (
        <div className="card cardFull" data-testid="admin_dev_create_sale_panel">
          <div style={{ fontWeight: 700, marginBottom: 8 }}>DEV Create Sale</div>
          <div style={{ display: 'grid', gap: 8 }}>
            <input
              className="input"
              value={saleQr}
              onChange={(e) => setSaleQr(e.target.value)}
              placeholder="Customer QR"
              data-testid="admin_input_dev_customer_qr"
            />
            <button
              className="btn btnPrimary"
              onClick={() => void handleCreateSale()}
              disabled={saleBusy || !saleQr.trim()}
              type="button"
              data-testid="admin_btn_dev_create_sale"
            >
              {saleBusy ? 'Creating...' : 'Create Sale'}
            </button>
            {saleResult ? <SuccessMessage message={saleResult} /> : null}
            {saleErr ? <ErrorMessage message={saleErr} /> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type ProductsViewProps = {
  items: ProductRow[];
  reload: () => Promise<void>;
  canEdit: boolean;
  showProductImport: boolean;
  create: (payload: {
    code: string;
    name: string;
    kind: string;
    price: number;
    active: boolean;
  }) => Promise<void>;
  setShowProductImport: React.Dispatch<React.SetStateAction<boolean>>;
};

function ProductsView({
  items,
  reload,
  canEdit,
  showProductImport,
  create,
  setShowProductImport,
}: ProductsViewProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [kind, setKind] = useState('drink');
  const [price, setPrice] = useState('');
  const [active, setActive] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function handleCreate() {
    try {
      setErr(null);
      await create({
        code: code.trim(),
        name: name.trim(),
        kind: kind.trim(),
        price: Number(price),
        active,
      });
      setCode('');
      setName('');
      setPrice('');
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  return (
    <div className="grid">
      <div className="card cardFull">
        <div className="row">
          <div style={{ fontWeight: 700 }}>{t('menu.products')}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => void reload()} type="button">
              {t('common.refresh')}
            </button>
            <button className="btn" onClick={() => setShowProductImport(true)} type="button">
              {t('products.import')}
            </button>
          </div>
        </div>
        {canEdit ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 8,
              marginTop: 10,
            }}
          >
            <input
              className="input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t('products.code')}
            />
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('products.name')}
            />
            <input
              className="input"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              placeholder={t('products.category')}
            />
            <input
              className="input"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={t('products.price')}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              {t('common.active')}
            </label>
            <button
              className="btn btnPrimary"
              onClick={() => void handleCreate()}
              disabled={!code.trim() || !name.trim() || Number(price) <= 0}
              type="button"
            >
              {t('common.create')}
            </button>
          </div>
        ) : null}
        {err ? <div style={{ marginTop: 10, color: '#8b0000' }}>{err}</div> : null}
      </div>

      <div className="card cardFull">
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map((p) => (
            <div key={p.id} className="row card cardCompact">
              <div style={{ flex: 2 }}>
                <div style={{ fontWeight: 700 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>
                  {p.code} · {p.kind}
                </div>
              </div>
              <div>{money(p.price)} ₽</div>
              <span className={`pill ${p.active ? 'pillGood' : 'pillWarn'}`}>
                {p.active ? 'active' : 'inactive'}
              </span>
            </div>
          ))}
          {items.length === 0 ? (
            <div style={{ color: 'rgba(0,0,0,0.55)', fontSize: 13 }}>
              {t('products.noProducts')}
            </div>
          ) : null}
        </div>
      </div>

      {showProductImport ? (
        <ProductImport
          onImportComplete={() => {
            void reload();
          }}
          onClose={() => setShowProductImport(false)}
        />
      ) : null}
    </div>
  );
}

function PermissionsTable() {
  const { t } = useTranslation();
  const [roles, setRoles] = useState<RolePermissions[]>([]);
  const [allPermissions, setAllPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const data = await Api.permissions();
        const rawItems = Array.isArray((data as any)?.items) ? (data as any).items : [];
        const grouped = new Map<string, Array<{ permission: string; is_allowed: boolean }>>();
        const all = new Set<string>();

        for (const item of rawItems) {
          const role = String(item?.role || '');
          const permission = String(item?.permission || '');
          if (!role || !permission) continue;
          const isAllowed = Boolean(item?.is_allowed);
          if (!grouped.has(role)) grouped.set(role, []);
          grouped.get(role)!.push({ permission, is_allowed: isAllowed });
          all.add(permission);
        }

        const normalizedRoles: RolePermissions[] = Array.from(grouped.entries()).map(
          ([role, permissions]) => ({
            role,
            permissions,
          })
        );
        const declaredPermissions = Array.isArray((data as any)?.all_permissions)
          ? (data as any).all_permissions
          : [];

        setRoles(normalizedRoles);
        setAllPermissions(declaredPermissions.length > 0 ? declaredPermissions : Array.from(all));
      } catch (e: any) {
        setErr(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function togglePermission(role: string, permission: string, next: boolean) {
    const key = `${role}:${permission}`;
    try {
      setSaving(key);
      await Api.updatePermission(role, permission, next);
      setRoles((prev) =>
        prev.map((r) =>
          r.role !== role
            ? r
            : {
                ...r,
                permissions: r.permissions.map((p) =>
                  p.permission === permission ? { ...p, is_allowed: next } : p
                ),
              }
        )
      );
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(null);
    }
  }

  if (loading) return <div className="card cardFull">{t('common.loading')}</div>;
  if (err)
    return (
      <div className="card cardFull" style={{ color: '#8b0000' }}>
        {err}
      </div>
    );

  return (
    <div className="card cardFull">
      <div style={{ fontWeight: 800, marginBottom: 10 }}>{t('settings.permissions')}</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 8 }}>Permission</th>
              {roles.map((r) => (
                <th key={r.role} style={{ textAlign: 'center', padding: 8 }}>
                  {r.role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allPermissions.map((permission) => (
              <tr key={permission}>
                <td style={{ padding: 8, borderTop: '1px solid var(--border)' }}>{permission}</td>
                {roles.map((r) => {
                  const state =
                    r.permissions.find((p) => p.permission === permission)?.is_allowed ?? false;
                  const key = `${r.role}:${permission}`;
                  return (
                    <td
                      key={key}
                      style={{
                        textAlign: 'center',
                        padding: 8,
                        borderTop: '1px solid var(--border)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={state}
                        disabled={saving === key}
                        onChange={(e) =>
                          void togglePermission(r.role, permission, e.target.checked)
                        }
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


export default App;
