import type { APIRequestContext, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { attachConsole, login, resetTestDatabase } from '../_shared';

const runtimeEnv =
  (globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  }).process?.env || {};

const TEST_ADMIN_SECRET = runtimeEnv.E2E_ADMIN_SECRET || 'test-secret-key';

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'x-admin-secret': token,
  };
}

async function apiLogin(request: APIRequestContext, username: string, password: string) {
  const response = await request.post('/api/v1/public/auth/login', {
    data: { username, password },
  });
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  expect(payload.token || payload.access_token).toBeTruthy();
  return String(payload.token || payload.access_token);
}

function runId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function createLoyaltyCustomer(request: APIRequestContext, ownerToken: string, suffix: string) {
  const numericSuffix = suffix.replace(/\D/g, '').slice(-7).padStart(7, '0');
  const phone = `+7999${numericSuffix}`;
  const fullName = `Loyalty E2E ${suffix}`;
  const response = await request.post('/api/v1/customers', {
    headers: authHeaders(ownerToken),
    data: { full_name: fullName, phone },
  });
  expect(response.ok()).toBeTruthy();
  const customer = await response.json();
  expect(Number(customer.id || 0)).toBeGreaterThan(0);
  expect(customer.qr_token).toBeTruthy();
  return {
    id: Number(customer.id),
    fullName,
    phone,
    qrToken: String(customer.qr_token),
  };
}

async function getCustomerByPhone(page: Page, phone: string) {
  const response = await page.request.get(`/api/v1/test/customer_by_phone?phone=${encodeURIComponent(phone)}`, {
    headers: { 'x-admin-secret': TEST_ADMIN_SECRET },
  });
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  expect(payload.customer).toBeTruthy();
  return payload.customer;
}

test.describe('Green House Loyalty Demo - Virtual Card & QR Code', () => {
  let testConsole: (() => Promise<void>) | null = null;

  test.beforeEach(async ({ page }) => {
    testConsole = attachConsole(page, test.info());
    await resetTestDatabase(page);
    await login(page, 'admin');
  });

  test.afterEach(async () => {
    if (testConsole) {
      await testConsole();
    }
  });

  test('loyalty customer receives qr token and can be identified by qr', async ({ page, request }) => {
    const ownerToken = await apiLogin(request, 'admin', 'admin');
    const suffix = runId();
    const customer = await createLoyaltyCustomer(request, ownerToken, suffix);

    const identifyResponse = await request.post('/api/v1/identify/qr', {
      headers: authHeaders(ownerToken),
      data: { qr: customer.qrToken },
    });
    expect(identifyResponse.ok()).toBeTruthy();
    const identified = await identifyResponse.json();
    expect(Number(identified.customer_id)).toBe(customer.id);

    const customerDb = await getCustomerByPhone(page, customer.phone);
    expect(String(customerDb.qr_token)).toBe(customer.qrToken);
    expect(Number(customerDb.balance_points ?? 0)).toBeGreaterThanOrEqual(0);

    await page.getByTestId('admin_nav_customers').click();
    await expect(page.getByTestId('admin_nav_customers')).toHaveAttribute('aria-selected', 'true');
  });

  test('loyalty sale updates customer transaction history', async ({ page, request }) => {
    const ownerToken = await apiLogin(request, 'admin', 'admin');
    const operatorToken = await apiLogin(request, 'operator', 'operator');
    const suffix = runId();
    const productCode = `LOYALTY_${suffix}`.slice(0, 24);

    const productResponse = await request.post('/api/v1/products', {
      headers: authHeaders(ownerToken),
      data: { code: productCode, name: `Loyalty Drink ${suffix}`, kind: 'goods', price: 250, active: true },
    });
    expect(productResponse.ok()).toBeTruthy();

    const customer = await createLoyaltyCustomer(request, ownerToken, suffix);

    const saleResponse = await request.post('/api/v1/pos/sale', {
      headers: authHeaders(operatorToken),
      data: {
        customer_id: customer.id,
        items: [{ code: productCode, name: `Loyalty Drink ${suffix}`, price: 250, qty: 1 }],
      },
    });
    expect(saleResponse.ok()).toBeTruthy();

    const transactionsResponse = await request.get(
      `/api/v1/test/transactions_by_customer?customer_id=${customer.id}`,
      { headers: { 'x-admin-secret': TEST_ADMIN_SECRET } }
    );
    expect(transactionsResponse.ok()).toBeTruthy();
    const transactions = await transactionsResponse.json();
    expect(Array.isArray(transactions.items)).toBeTruthy();
    expect(transactions.items.length).toBeGreaterThan(0);

    const firstTx = transactions.items[0];
    expect(Number(firstTx.total_amount)).toBe(250);
    expect(Number(firstTx.bonus_earned ?? 0)).toBeGreaterThanOrEqual(0);

    await page.getByTestId('admin_nav_pos').click();
    await expect(page.getByTestId('admin_nav_pos')).toHaveAttribute('aria-selected', 'true');
  });

  test('loyalty analytics endpoints respond for seeded data', async ({ page, request }) => {
    const ownerToken = await apiLogin(request, 'admin', 'admin');

    const seedResponse = await page.request.post('/api/v1/test/seed', {
      headers: { 'x-admin-secret': TEST_ADMIN_SECRET },
    });
    expect(seedResponse.ok()).toBeTruthy();

    const loyaltyChartResponse = await request.get('/api/v1/analytics/dashboard/loyalty?time_range=7d&interval=day', {
      headers: authHeaders(ownerToken),
    });
    expect(loyaltyChartResponse.ok()).toBeTruthy();
    const loyaltyChart = await loyaltyChartResponse.json();
    expect(Array.isArray(loyaltyChart.data)).toBeTruthy();

    const loyaltyOverviewResponse = await request.get('/api/v1/analytics/reports/loyalty/overview?time_range=30d', {
      headers: authHeaders(ownerToken),
    });
    expect(loyaltyOverviewResponse.ok()).toBeTruthy();
    const overview = await loyaltyOverviewResponse.json();
    expect(overview.metrics).toBeTruthy();
    expect(Number(overview.metrics.points_earned ?? 0)).toBeGreaterThanOrEqual(0);

    const loyaltyDetailedResponse = await request.get('/api/v1/analytics/reports/loyalty/detailed?time_range=30d', {
      headers: authHeaders(ownerToken),
    });
    expect(loyaltyDetailedResponse.ok()).toBeTruthy();
    const detailed = await loyaltyDetailedResponse.json();
    expect(Array.isArray(detailed.customer_data)).toBeTruthy();

    await page.getByTestId('admin_nav_analytics').click();
    await expect(page.getByTestId('admin_nav_analytics')).toHaveAttribute('aria-selected', 'true');
  });
});
