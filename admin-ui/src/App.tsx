import * as QRCode from 'qrcode';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnalyticsView } from './AnalyticsView';
import {
    AdminMe,
    Api,
    CreateSaleRequest,
    CustomerDetails,
    CustomerListItem,
    Integration,
    IntegrationDelivery,
    IntegrationTemplate,
    RolePermissions,
    setAdminSecret,
} from './api';
import { ComplianceView } from './ComplianceView';
import { DashboardView } from './components/dashboard/DashboardView';
import { IntegrationSettings } from './components/IntegrationSettings';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { ProductImport } from './components/ProductImport';
import { type ThemeMode, ThemeSwitcher } from './components/ThemeSwitcher';
import { ErrorMessage, SuccessMessage, WarningMessage } from './components/ui';
import { useDashboardData } from './hooks/useDashboardData';
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
  admin_auth_configured: boolean;
  debug_mode: boolean;
  erp_sync_enabled: boolean;
};

type NoticeLevel = 'ok' | 'warn' | 'err';
type Notice = { level: NoticeLevel; message: string; visible: boolean };

function money(n: number, locale?: string) {
  const storedLocale =
    typeof window !== 'undefined' ? window.localStorage.getItem('i18nextLng') || undefined : undefined;
  const appLocale = (locale || storedLocale || 'en').toLowerCase();
  const localeMap: Record<string, string> = {
    en: 'en-US',
    ru: 'ru-RU',
    srb: 'sr-RS',
  };
  const resolvedLocale = localeMap[appLocale] || appLocale;

  try {
    return new Intl.NumberFormat(resolvedLocale).format(n);
  } catch {
    return new Intl.NumberFormat('en-US').format(n);
  }
}

function App() {
  // Use auth context for authentication state
  const { t, i18n } = useTranslation();
  const viewport = useViewportMode();
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'light';
    const savedTheme = window.localStorage.getItem('theme');
    if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

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
  } = useAuth();

  const [tab, setTab] = useState<Tab>('dashboard');
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [customerPage, setCustomerPage] = useState(1);
  const [customerTotal, setCustomerTotal] = useState(0);
  const [customerLimit] = useState(15);
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [details, setDetails] = useState<CustomerDetails | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const customerRequestRef = useRef(0);
  const [searchSuggestions, setSearchSuggestions] = useState<CustomerListItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showSettingsOld, setShowSettingsOld] = useState(false);
  const [showSettingsNew, setShowSettingsNew] = useState(false);

  const [publicStatus, setPublicStatus] = useState<PublicStatus | null>(null);
  const [username, setUsername] = useState(() => {
    if (typeof localStorage === 'undefined') return 'admin';
    return localStorage.getItem('admin_login_username') || 'admin';
  });
  const [password, setPassword] = useState('');
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

  // Use auth context values
  const effectiveAuthReady = !authLoading && (isAuthenticated || authReady);
  const effectiveMe = user || me;

  console.log(
    `[App] Render. Username=${username} PasswordLen=${password.length} Notice=${notice ? JSON.stringify(notice) : 'null'} AuthLoading=${authLoading} IsAuth=${isAuthenticated}`
  );

  // Session restoration: check auth context on mount
  useEffect(() => {
    console.log('[App] Auth context check:', { authLoading, isAuthenticated, user: !!user });
    if (!authLoading) {
      if (isAuthenticated && user) {
        console.log('[App] Session restored from JWT cookies');
        setMe(user);
        setAuthReady(true);
      } else {
        console.log('[App] No valid session, showing login');
        setAuthReady(false);
      }
    }
  }, [authLoading, isAuthenticated, user]);

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('admin_login_username', username);
  }, [username]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', themeMode);
    document.documentElement.style.colorScheme = themeMode;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('theme', themeMode);
    }
  }, [themeMode]);

  useEffect(() => {
    if (!selectedId || selectedId <= 0) {
      setDetails(null);
      setQrCodeUrl('');
      return;
    }

    void loadCustomer(selectedId);
  }, [selectedId]);

  function handleSelectCustomer(id: number | null) {
    if (!id || id <= 0) {
      setSelectedId(null);
      setDetails(null);
      setQrCodeUrl('');
      return;
    }

    setSelectedId(id);
  }

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
  const canReadDashboard = useMemo(
    () =>
      effectiveMe?.role === 'owner' ||
      effectivePermissions.has('*') ||
      effectivePermissions.has('dashboard.read'),
    [effectiveMe?.role, effectivePermissions]
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

  const {
    data: dashboardData,
    refresh: refreshDashboard,
    invalidate: invalidateDashboard,
  } = useDashboardData({
    enabled: effectiveAuthReady && Boolean(effectiveMe) && canReadDashboard && tab === 'dashboard',
    roleKey: effectiveMe?.role || 'anonymous',
  });

  const allowedTabs = useMemo<Tab[]>(() => {
    if (!effectiveMe) {
      return [];
    }

    const tabs: Tab[] = ['customers', 'products', 'pos', 'settings'];

    if (canReadDashboard) {
      tabs.unshift('dashboard');
    }

    if (canReadIntegrations) {
      tabs.push('integrations');
    }

    if (
      effectiveMe.role === 'owner' ||
      effectivePermissions.has('*') ||
      effectivePermissions.has('marketing.campaign')
    ) {
      tabs.push('marketing');
    }

    if (
      effectiveMe.role === 'owner' ||
      effectivePermissions.has('*') ||
      effectivePermissions.has('analytics.read')
    ) {
      tabs.push('analytics');
    }

    if (
      effectiveMe.role === 'owner' ||
      effectivePermissions.has('*') ||
      effectivePermissions.has('compliance.read')
    ) {
      tabs.push('compliance');
    }

    return tabs;
  }, [effectiveMe, effectivePermissions, canReadDashboard, canReadIntegrations]);

  const safeTab = useMemo<Tab>(() => {
    return allowedTabs.includes(tab) ? tab : allowedTabs[0] || 'settings';
  }, [allowedTabs, tab]);

  const showProtectedPanels = effectiveAuthReady && Boolean(effectiveMe);
  const showLoginScreen = !effectiveAuthReady || !effectiveMe;

  async function doLoginByPassword() {
    try {
      setError(null);
      await authLogin(username.trim(), password);
      await bootstrap();
    } catch (e: any) {
      showNotice('err', String(e?.message || e));
    }
  }

  async function doLogout() {
    try {
      await authLogout();
      setAdminSecret('');
      setAuthReady(false);
      setMustChangePassword(false);
      setMe(null);
      setTab('dashboard');
    } catch (e: any) {
      showNotice('err', String(e?.message || e));
    }
  }

  async function doChangePassword() {
    try {
      await Api.changePassword(oldPassword, settingsNewPassword);
      setOldPassword('');
      setSettingsNewPassword('');
      showNotice('ok', t('auth.passwordChangeSuccess', 'Password updated'));
    } catch (e: any) {
      showNotice('err', String(e?.message || e));
    }
  }

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

  async function loadPublicStatus() {
    try {
      const s = await Api.publicStatus();
      setPublicStatus(s);
    } catch {
      setPublicStatus(null);
    }
  }

  async function loadCustomers(query?: string, page: number = 1, limit: number = 15) {
    setError(null);

    // Enhanced search parsing
    let enhancedQuery = query || '';

    if (enhancedQuery) {
      // Handle numeric ID search (pure numbers)
      if (/^\d+$/.test(enhancedQuery.trim())) {
        enhancedQuery = `id:${enhancedQuery.trim()}`;
      }
      // Handle QR code search (8 digits)
      else if (/^\d{8}$/.test(enhancedQuery.trim())) {
        enhancedQuery = `qr:${enhancedQuery.trim()}`;
      }
      // Handle range operators like >5000<1000, >5000, <2000, !=10
      else if (/^([><=!])(\d+)(<(\d+))?$/.test(enhancedQuery.trim())) {
        const match = enhancedQuery.trim().match(/^([><=!])(\d+)(<(\d+))?$/);
        if (match) {
          const [, operator, value1, , value2] = match;
          if (operator === '>' && value2) {
            enhancedQuery = `balance:${value1}-${value2}`;
          } else if (operator === '>') {
            enhancedQuery = `balance>${value1}`;
          } else if (operator === '<') {
            enhancedQuery = `balance<${value1}`;
          } else if (operator === '!' || operator === '!=') {
            enhancedQuery = `balance!${value1}`;
          }
        }
      }
      // Handle phone numbers
      else if (/^[\d\s\-+()]+$/.test(enhancedQuery.trim())) {
        enhancedQuery = `phone:${enhancedQuery.trim()}`;
      }
      // Default to name search for text
      else {
        enhancedQuery = `name:${enhancedQuery.trim()}`;
      }
    }

    const res = await Api.customers(enhancedQuery, page, limit);
    setCustomers(res.items);
    setCustomerTotal(res.pagination.total);
    setCustomerPage(page);
  }

  async function loadCustomer(id: number) {
    setError(null);
    const requestId = customerRequestRef.current + 1;
    customerRequestRef.current = requestId;
    const d = await Api.customer(id);
    if (customerRequestRef.current !== requestId) {
      return;
    }
    setDetails(d);

    // Generate QR code for the customer
    if (d.customer.qr_token) {
      try {
        const qrDataUrl = await QRCode.toDataURL(d.customer.qr_token, {
          width: 200,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });
        if (customerRequestRef.current !== requestId) {
          return;
        }
        setQrCodeUrl(qrDataUrl);
      } catch (err) {
        console.error('Failed to generate QR code:', err);
        setQrCodeUrl('');
      }
    } else {
      setQrCodeUrl('');
    }
  }

  async function searchCustomers(query: string) {
    if (!query.trim()) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const res = await Api.customers(query, 1, 5);
      setSearchSuggestions(res.items);
      setShowSuggestions(true);
    } catch (err) {
      console.error('Failed to search customers:', err);
      setSearchSuggestions([]);
    }
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
      if (!user) {
        setMe(null);
        setAuthReady(false);
        return;
      }

      await loadPublicStatus();

      setMe(user);
      console.log('[Bootstrap] Using user from auth context:', user.username);

      try {
        await Promise.all([
          loadCustomers('', 1, customerLimit),
          loadProducts(),
          canReadDashboard ? refreshDashboard() : Promise.resolve(),
        ]);
      } catch (dataError: any) {
        console.warn('[Bootstrap] Failed to load some data:', dataError?.message);
      }

      setAuthReady(true);
    } catch (e: any) {
      const msg = String(e?.message || e);
      // Only show error for actual errors, not auth-related issues
      if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
        setAuthReady(false);
        return;
      }
      showNotice('err', msg);
      setAuthReady(false);
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
  }, [authLoading, user, canReadDashboard]);

  useEffect(() => {
    if (!showProtectedPanels) return;
    if (selectedId != null) {
      loadCustomer(selectedId).catch((e) => setError(String(e)));
    }
  }, [selectedId, showProtectedPanels]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (!hash || !showProtectedPanels) return;

      const [tabName, queryString] = hash.split('?');
      const params = new URLSearchParams(queryString || '');
      const tabMap: Record<string, Tab> = {
        dashboard: 'dashboard',
        customers: 'customers',
        pos: 'pos',
        integrations: 'integrations',
        products: 'products',
        settings: 'settings',
        marketing: 'marketing',
        analytics: 'analytics',
        compliance: 'compliance',
      };

      const nextTab = tabMap[tabName];
      if (nextTab && allowedTabs.includes(nextTab)) {
        setTab(nextTab);
      }

      const customerId = params.get('customer');
      if (customerId) {
        const id = Number.parseInt(customerId, 10);
        if (!Number.isNaN(id)) {
          setSelectedId(id);
        }
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [allowedTabs, showProtectedPanels]);

  useEffect(() => {
    if (!showProtectedPanels) return;
    if (tab === 'integrations' && canReadIntegrations) {
      Promise.all([loadIntegrations(), loadIntegrationTemplates()]).catch((e) =>
        setError(String(e))
      );
    }
  }, [tab, canReadIntegrations, showProtectedPanels]);

  useEffect(() => {
    if (!showProtectedPanels) return;
    if (tab === 'integrations' && canReadIntegrations && selectedIntegrationId != null) {
      loadDeliveries(selectedIntegrationId).catch((e) => setError(String(e)));
    }
  }, [selectedIntegrationId, tab, canReadIntegrations, showProtectedPanels]);

  useEffect(() => {
    if (tab === 'integrations' && !canReadIntegrations && integrationSubTab === 'settings') {
      setIntegrationSubTab('webhooks');
    }
  }, [tab, canReadIntegrations, integrationSubTab]);

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
        setOldPassword('');
        setSettingsNewPassword('');
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    if (!effectiveAuthReady) return;
    if (tab !== safeTab) setTab(safeTab);
  }, [safeTab, tab, effectiveAuthReady]);

  useEffect(() => {
    if (!showProtectedPanels) return;
    if (window.location.pathname === '/admin/login') {
      window.history.replaceState(null, '', '/admin');
    }
  }, [showProtectedPanels]);

  return (
    <div className={`container app-shell mode-${viewport.mode} density-${viewport.density}`}>
      {!showLoginScreen ? (
        <header className="header">
          <nav aria-label="Main navigation" style={{ width: '100%' }}>
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
            <div className="header-toolbar">
            <ThemeSwitcher value={themeMode} onChange={setThemeMode} />
            <LanguageSwitcher />
            <div className="pill role-pill">
              {t('common.role')}: {roleLabel(me?.role || '')}
            </div>
          </div>
          ) : null}
        </header>
      ) : null}
      {/* Show login form when not authenticated OR when auth is still loading */}
      {showLoginScreen ? (
        <div className="login-page">
          <div className="login-card">
            <div className="login-header">
              <div className="login-title">{t('app.title')}</div>
              <div className="login-subtitle">{t('auth.login')}</div>
            </div>

            <div className="login-form">
              <input
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('auth.loginPlaceholder')}
                autoComplete="username"
                spellCheck={false}
                data-testid="common_input_username_en"
              />
              <div className="login-password-row">
                <input
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.passwordPlaceholder')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
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
              <button
                className="btn btnPrimary login-submit"
                onClick={() => void doLoginByPassword()}
                disabled={!username.trim() || !password}
                data-testid="common_btn_login_en"
              >
                {t('auth.loginButton')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <main
        aria-label="Main content"
        data-viewport-mode={viewport.mode}
        data-viewport-density={viewport.density}
      >
        {!showLoginScreen && notice?.visible ? (
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

        {showProtectedPanels && safeTab === 'dashboard' ? (
          <div id="dashboard-panel" role="tabpanel" aria-labelledby="dashboard-tab">
            <DashboardView data={dashboardData} reload={refreshDashboard} onNavigate={navigateTo} />
          </div>
        ) : null}
        {showProtectedPanels && safeTab === 'customers' ? (
          <div id="customers-panel" role="tabpanel" aria-labelledby="customers-tab">
            <CustomersView
              q={q}
              setQ={setQ}
              customers={customers}
              select={handleSelectCustomer}
              selected={selected}
              details={details}
              search={() => loadCustomers(q, customerPage, customerLimit)}
              refresh={() => loadCustomers('', 1, customerLimit)}
              page={customerPage}
              total={customerTotal}
              limit={customerLimit}
              onPageChange={(newPage) => loadCustomers(q, newPage, customerLimit)}
              searchSuggestions={searchSuggestions}
              showSuggestions={showSuggestions}
              onSearchChange={searchCustomers}
              setShowSuggestions={setShowSuggestions}
              onSuggestionSelect={(customer) => {
                handleSelectCustomer(customer.id);
                const customerName =
                  customer.full_name || customer.phone || t('customers.unnamed', { id: customer.id });
                setQ(customerName);
                setShowSuggestions(false);
                // Also filter the main customer list
                loadCustomers(customerName, 1, customerLimit);
              }}
              qrCodeUrl={qrCodeUrl}
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
                if (canReadDashboard) {
                  await invalidateDashboard();
                }
                await loadCustomers();
                handleSelectCustomer(customerId);
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
                      await Promise.all([
                        canReadDashboard ? invalidateDashboard() : Promise.resolve(),
                        loadCustomers(),
                      ]);
                      handleSelectCustomer(result.customer_id);
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
                    <div className="settings-title">{t('auth.accessSettings')}</div>
                    <div className="settings-desc">
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
      </main>
      <footer role="contentinfo" className="footerVersion">
        v{__APP_VERSION__}
        {__BUILD_ID__ ? ` · ${String(__BUILD_ID__).slice(0, 10)}` : ''}
      </footer>
    </div>
  );
}

// DashboardViewProps is defined in ./components/dashboard/DashboardView

type CustomersViewProps = {
  q: string;
  setQ: React.Dispatch<React.SetStateAction<string>>;
  customers: CustomerListItem[];
  select: (id: number) => void;
  selected: CustomerListItem | null;
  details: CustomerDetails | null;
  search: () => Promise<void>;
  refresh: () => Promise<void>;
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  searchSuggestions: CustomerListItem[];
  showSuggestions: boolean;
  onSearchChange: (query: string) => void;
  onSuggestionSelect: (customer: CustomerListItem) => void;
  qrCodeUrl: string;
  setShowSuggestions: (show: boolean) => void;
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
  page,
  total,
  limit,
  onPageChange,
  searchSuggestions,
  showSuggestions,
  onSearchChange,
  onSuggestionSelect,
  qrCodeUrl,
  setShowSuggestions,
}: CustomersViewProps) {
  const { t, i18n } = useTranslation();

  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  const customerName = details?.customer.full_name || selected?.full_name || '—';
  const customerPhone = details?.customer.phone || selected?.phone || '—';
  const customerBalance = Number(details?.customer.balance_points ?? selected?.balance_points ?? 0);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        height: '100%',
        padding: '20px',
        backgroundColor: '#f8fafc',
      }}
    >
      {/* Search Controls */}
      <div
        style={{
          backgroundColor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '16px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            position: 'relative',
            flex: 1,
            flexWrap: 'wrap',
          }}
        >
          <input
            className="input"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              onSearchChange(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                search();
                setShowSuggestions(false);
              }
            }}
            onFocus={() => {
              if (q.trim()) {
                // Show suggestions will be handled by parent
              }
            }}
            onBlur={() => {
              // Delay hiding suggestions to allow click on suggestion
              setTimeout(() => {
                // Parent will handle hiding
              }, 200);
            }}
            placeholder={t('customers.search')}
            autoComplete="off"
            data-testid="customers_search_input"
            style={{
              flex: 1,
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />

          {/* Search Suggestions */}
          {showSuggestions && searchSuggestions.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: 'white',
                border: '1px solid #d1d5db',
                borderTop: 'none',
                borderRadius: '0 0 6px 6px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                zIndex: 1000,
                maxHeight: '200px',
                overflowY: 'auto',
              }}
            >
              {searchSuggestions?.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => {
                    onSuggestionSelect(customer);
                  }}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f3f4f6',
                    fontSize: '14px',
                    color: '#374151',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                >
                  <div style={{ fontWeight: '500' }}>
                    {customer.full_name || t('customers.unnamed', { id: customer.id })}
                  </div>
                  {customer.phone && (
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{customer.phone}</div>
                  )}
                </div>
              ))}
            </div>
          )}
          <button
            className="btn btnPrimary"
            onClick={() => void search()}
            type="button"
            data-testid="customers_search_button"
            style={{
              padding: '12px 20px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            {t('common.search')}
          </button>
          <button
            className="btn"
            onClick={() => void refresh()}
            type="button"
            data-testid="customers_clear_button"
            style={{
              padding: '12px 20px',
              backgroundColor: 'white',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            {t('common.refresh')}
          </button>
        </div>
      </div>

      {/* Main Content: List + Details */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(360px, 420px) minmax(0, 1fr)',
          gap: '20px',
          flex: 1,
          minHeight: '500px',
          alignItems: 'stretch',
        }}
      >
        {/* Customer List - Left Side */}
        <div
          style={{
            minWidth: 0,
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* List Header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: '600',
                color: '#1e293b',
              }}
            >
              {i18n.language === 'ru' ? 'Список клиентов' : 'Customer List'}
            </h3>
            <span
              style={{
                fontSize: '12px',
                color: '#64748b',
                backgroundColor: '#e2e8f0',
                padding: '4px 8px',
                borderRadius: '12px',
              }}
            >
              {total} {i18n.language === 'ru' ? 'клиентов' : 'customers'}
            </span>
          </div>

          {/* Customer Items */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '8px',
            }}
          >
            {customers?.map((c) => {
              // Skip customers without essential data
              if (!c.full_name && !c.phone) {
                return null;
              }

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => select(c.id)}
                  data-testid={`customer_item_${c.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    padding: '16px',
                    border: selected?.id === c.id ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    backgroundColor: selected?.id === c.id ? '#f0f9ff' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left',
                    width: '100%',
                    marginBottom: '8px',
                    boxShadow: selected?.id === c.id ? '0 0 0 3px rgba(37, 99, 235, 0.1)' : 'none',
                    gap: '12px',
                  }}
                  onMouseEnter={(e) => {
                    if (selected?.id !== c.id) {
                      e.currentTarget.style.borderColor = '#2563eb';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selected?.id !== c.id) {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <div
                      style={{
                        fontWeight: '600',
                        fontSize: '14px',
                        color: '#1e293b',
                      }}
                    >
                      {c.full_name || `Клиент #${c.id}`}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {c.phone || 'Телефон не указан'}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#94a3b8',
                        fontFamily: 'monospace',
                      }}
                    >
                      ID: {c.id}
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: '4px',
                    }}
                  >
                    <div
                      style={{
                        fontWeight: '700',
                        fontSize: '14px',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                      }}
                    >
                      {c.balance_points} ₽
                    </div>
                  </div>
                </button>
              );
            })}
            {(customers?.length ?? 0) === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: '#64748b',
                  fontSize: '14px',
                }}
              >
                {i18n.language === 'ru' ? 'Клиенты не найдены' : 'No customers found'}
              </div>
            ) : null}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                padding: '16px 20px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f8fafc',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  color: '#64748b',
                }}
              >
                {i18n.language === 'ru' ? 'Страница' : 'Page'} {page}{' '}
                {i18n.language === 'ru' ? 'из' : 'of'} {totalPages} ({total}{' '}
                {i18n.language === 'ru' ? 'всего' : 'total'})
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                }}
              >
                <button
                  onClick={() => onPageChange(page - 1)}
                  disabled={!hasPrevPage}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: hasPrevPage ? '#2563eb' : '#e2e8f0',
                    color: hasPrevPage ? 'white' : '#94a3b8',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: hasPrevPage ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease',
                  }}
                >
                  ← {i18n.language === 'ru' ? 'Назад' : 'Previous'}
                </button>

                <span
                  style={{
                    fontSize: '12px',
                    color: '#374151',
                    fontWeight: '500',
                  }}
                >
                  {page}
                </span>

                <button
                  onClick={() => onPageChange(page + 1)}
                  disabled={!hasNextPage}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: hasNextPage ? '#2563eb' : '#e2e8f0',
                    color: hasNextPage ? 'white' : '#94a3b8',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: hasNextPage ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {i18n.language === 'ru' ? 'Вперед' : 'Next'} →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Customer Details - Right Side */}
        <div
          style={{
            minWidth: 0,
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {details ? (
            <>
              {/* Details Header */}
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#1e293b',
                  }}
                >
                  {i18n.language === 'ru' ? 'Детали клиента' : 'Customer Details'}
                </h3>
                <button
                  onClick={() => select(0)}
                  data-testid="close_customer_details"
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '18px',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    color: '#64748b',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e2e8f0';
                    e.currentTarget.style.color = '#374151';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#64748b';
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Details Content */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                }}
              >
                {/* Customer Profile */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '12px',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: '600',
                    }}
                  >
                    {details.customer.full_name?.charAt(0) || '#'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div
                      style={{
                        fontWeight: '600',
                        fontSize: '16px',
                        color: '#1e293b',
                      }}
                    >
                      {details.customer.full_name || '—'}
                    </div>
                    <div style={{ fontSize: '14px', color: '#64748b' }}>
                      {details.customer.phone || '—'}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#94a3b8',
                        fontFamily: 'monospace',
                      }}
                    >
                      ID: {details.customer.id}
                    </div>
                  </div>
                </div>

                {/* Balance Card */}
                <div
                  style={{
                    padding: '16px',
                    background: 'linear-gradient(135deg, #dbeafe, #2563eb)',
                    color: 'white',
                    borderRadius: '8px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>
                    {i18n.language === 'ru' ? 'Баланс' : 'Balance'}
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '700' }}>
                    {customerBalance.toLocaleString()} ₽
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      padding: '14px 16px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
                      {i18n.language === 'ru' ? 'Покупок' : 'Transactions'}
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>
                      {details.transactions.length}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '14px 16px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
                      {i18n.language === 'ru' ? 'QR токен' : 'QR Token'}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>
                      {details.customer.qr_token ? 'Available' : '—'}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '14px 16px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
                      {i18n.language === 'ru' ? 'Последняя активность' : 'Last activity'}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>
                      {details.transactions[0]?.created_at
                        ? new Date(details.transactions[0].created_at).toLocaleDateString()
                        : '—'}
                    </div>
                  </div>
                </div>

                {/* QR Code Section */}
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '12px',
                    }}
                  >
                    QR Code
                  </div>
                  <div
                    style={{
                      padding: '20px',
                      backgroundColor: '#f8fafc',
                      border: '2px dashed #d1d5db',
                      borderRadius: '8px',
                    }}
                  >
                    {qrCodeUrl ? (
                      <img
                        src={qrCodeUrl}
                        alt="QR Code"
                        style={{
                          width: '200px',
                          height: '200px',
                          border: '4px solid white',
                          borderRadius: '8px',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          fontSize: '48px',
                          marginBottom: '8px',
                          fontFamily: 'monospace',
                          fontWeight: 'bold',
                        }}
                      >
                        ▓▓▓▓▓▓▓▓
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#64748b',
                        fontFamily: 'monospace',
                        marginTop: '8px',
                      }}
                    >
                      {details.customer.qr_token || `Customer ID: ${details.customer.id}`}
                    </div>
                  </div>
                </div>

                {/* Transactions */}
                <div>
                  <h4
                    style={{
                      margin: '0 0 12px 0',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#1e293b',
                    }}
                  >
                    {i18n.language === 'ru' ? 'Последние транзакции' : 'Recent Transactions'}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {details.transactions.slice(0, 10).map((tx) => (
                      <div
                        key={tx.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px',
                          backgroundColor: '#f8fafc',
                          borderRadius: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div
                            style={{
                              fontSize: '11px',
                              fontWeight: '600',
                              color: '#64748b',
                            }}
                          >
                            #{tx.id}
                          </div>
                          <div
                            style={{
                              fontSize: '11px',
                              color: '#94a3b8',
                            }}
                          >
                            {new Date(tx.created_at).toLocaleString()}
                          </div>
                        </div>
                        <div
                          style={{
                            fontWeight: '600',
                            color: '#059669',
                            fontSize: '14px',
                          }}
                        >
                          {money(tx.total_amount, i18n.language)} ₽
                        </div>
                      </div>
                    ))}
                    {details.transactions.length === 0 ? (
                      <div
                        style={{
                          textAlign: 'center',
                          padding: '20px',
                          color: '#64748b',
                          fontSize: '12px',
                        }}
                      >
                        {i18n.language === 'ru' ? 'Нет транзакций' : 'No transactions'}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Empty State */
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                textAlign: 'center',
                color: '#64748b',
                padding: '40px',
              }}
            >
              <div
                style={{
                  fontSize: '64px',
                  marginBottom: '16px',
                  opacity: 0.5,
                }}
              >
                👤
              </div>
              <div style={{ fontSize: '16px' }}>
                {i18n.language === 'ru' ? 'Выберите клиента в списке' : 'Select customer from list'}
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
  const { t, i18n } = useTranslation();
  const [customerId, setCustomerId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [qty, setQty] = useState('1');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Auto-load products on mount if empty
  useEffect(() => {
    if (!products || products.length === 0) {
      void reloadProducts();
    }
  }, []);

  async function submitSale() {
    const parsedCustomerId = Number(customerId.trim());
    const parsedQty = Number(qty.trim());
    const product = products?.find((p) => String(p.id) === selectedProductId);

    if (!Number.isInteger(parsedCustomerId) || parsedCustomerId < 1) {
      setErr('Customer ID must be a positive integer');
      return;
    }
    if (!product) {
      setErr('Select a product');
      return;
    }
    if (!product.active) {
      setErr('Selected product is inactive');
      return;
    }
    if (!Number.isInteger(parsedQty) || parsedQty < 1) {
      setErr('Invalid sale data');
      return;
    }

    setBusy(true);
    setErr(null);
    setNotice(null);
    try {
      const saleRequest: CreateSaleRequest = {
        customer_id: parsedCustomerId,
        items: [
          { code: product.code, name: product.name, price: Number(product.price), qty: parsedQty },
        ],
      };
      await Api.createSale(saleRequest);
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
              ?.filter((p) => p.active)
              .map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.code} - {p.name} ({money(p.price, i18n.language)} ₽)
                </option>
              )) ?? <option value="">{t('sales.noProducts')}</option>}
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
            ? items?.map((i) => (
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
          {canManage && items?.length === 0 && !busy ? (
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
                <button
                  className="btn btnPrimary"
                  onClick={() => void handleCreate()}
                  type="button"
                >
                  {t('common.create')}
                </button>
              )}
            </div>
            {err ? <div style={{ color: '#8b0000' }}>{err}</div> : null}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {templates?.map((tpl) => (
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
  const { t, i18n } = useTranslation();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [kind, setKind] = useState('');
  const [price, setPrice] = useState('');
  const [active, setActive] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const handleCreate = async () => {
    setErr(null);
    try {
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
  };

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
          {items?.map((p) => (
            <div key={p.id} className="row card cardCompact">
              <div style={{ flex: 2 }}>
                <div style={{ fontWeight: 700 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>
                  {p.code} · {p.kind}
                </div>
              </div>
              <div>{money(p.price, i18n.language)} ₽</div>
              <span className={`pill ${p.active ? 'pillGood' : 'pillWarn'}`}>
                {p.active ? 'active' : 'inactive'}
              </span>
            </div>
          ))}
          {items?.length === 0 ? (
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
              <th style={{ textAlign: 'left', padding: 8 }}>{t('settings.permission')}</th>
              {roles.map((r) => (
                <th key={r.role} style={{ textAlign: 'center', padding: 8 }}>
                  {t(`roles.${r.role}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allPermissions.map((permission) => (
              <tr key={permission}>
                <td style={{ padding: 8, borderTop: '1px solid var(--border)' }}>
                  {t(`settings.permissionNames.${permission}`, permission)}
                </td>
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
