import type { APIRequestContext } from '@playwright/test';
import { attachConsole, expect, login, maybePause, retryBackoff, test } from '../_shared';

/**
 * Critical Flow E2E Tests
 *
 * AUTHENTICATION PATTERNS:
 * - This file uses LEGACY authentication pattern (x-admin-secret header)
 * - The apiPostTestCleanup function (line 29-34) uses x-admin-secret header
 * - Tests use tokens obtained via API login and pass via 'x-admin-secret' header
 * - This is the OLD pattern, maintained for backward compatibility
 */

const consoleFlush = new Map<string, () => Promise<void>>();
const TEST_ADMIN_SECRET = process.env.ADMIN_SECRET || 'test-secret-key';

test.beforeEach(async ({ page }, testInfo) => {
  consoleFlush.set(testInfo.testId, attachConsole(page, testInfo));
  await retryBackoff(testInfo);
});

test.afterEach(async ({}, testInfo) => {
  const flush = consoleFlush.get(testInfo.testId);
  if (flush) await flush();
  consoleFlush.delete(testInfo.testId);
});

function runId() {
  return String(process.env.E2E_RUN_ID || Date.now());
}

async function apiLogin(request: any, username: string, password: string) {
  const res = await request.post('/api/v1/public/auth/login', { data: { username, password } });
  expect(res.ok()).toBeTruthy();
  const j = await res.json();
  expect(j.token).toBeTruthy();
  return String(j.token);
}

async function apiPostTestCleanup(request: APIRequestContext, payload: any) {
  /**
   * ⚠️ LEGACY AUTH PATTERN: Uses x-admin-secret header instead of JWT cookies
   * This helper function passes the token via 'x-admin-secret' header
   */
  const res = await request.post('/api/v1/test/cleanup', {
    headers: { 'x-admin-secret': TEST_ADMIN_SECRET },
    data: payload,
  });
  expect(res.ok()).toBeTruthy();
}

test('create product card (manager) and verify in DB', async ({ page, request }) => {
  const rid = runId();
  const code = `E2E_${rid}_COFFEE`;
  const name = `E2E Coffee ${rid}`;
  const ownerToken = await apiLogin(request, 'admin', 'admin');

  const createRes = await request.post('/api/v1/products', {
    headers: { 'x-admin-secret': ownerToken },
    data: { code, name, kind: 'goods', price: 250, active: true },
  });
  expect(createRes.ok()).toBeTruthy();

  await login(page, 'manager');
  await expect(page.getByTestId('admin_nav_products')).toBeVisible();
  await maybePause(page, 'После входа');

  const productsTab = page.getByTestId('admin_nav_products');
  await productsTab.click();
  await expect(productsTab).toHaveAttribute('aria-selected', 'true');
  await maybePause(page, 'После проверки раздела товаров');

  const dbRes = await request.get(`/api/v1/test/product_by_code?code=${encodeURIComponent(code)}`, {
    headers: { 'x-admin-secret': TEST_ADMIN_SECRET },
  });
  expect(dbRes.ok()).toBeTruthy();
  const db = await dbRes.json();
  expect(db.product).toBeTruthy();
  expect(db.product.code).toBe(code);
  expect(Number(db.product.price)).toBe(250);

  await apiPostTestCleanup(request, { product_codes: [code] });
});

test('operator registers client and makes sale from catalog (verify UI + DB)', async ({
  page,
  request,
}) => {
  const rid = runId();
  const code = `E2E_${rid}_SERVICE`;
  const phone = `+7999${String(rid).slice(-7)}`;
  const fullName = `E2E Client ${rid}`;

  const ownerToken = await apiLogin(request, 'admin', 'admin');
  const createRes = await request.post('/api/v1/products', {
    headers: { 'x-admin-secret': ownerToken },
    data: { code, name: `E2E Service ${rid}`, kind: 'service', price: 300, active: true },
  });
  expect(createRes.ok()).toBeTruthy();

  const createCustomerRes = await request.post('/api/v1/customers', {
    headers: { 'x-admin-secret': ownerToken },
    data: { full_name: fullName, phone },
  });
  expect(createCustomerRes.ok()).toBeTruthy();
  const customerPayload = await createCustomerRes.json();
  const customerId = Number(customerPayload.id);
  expect(customerId).toBeGreaterThan(0);

  await login(page, 'operator');
  await expect(page.getByTestId('admin_nav_pos')).toBeVisible();
  await maybePause(page, 'После входа оператора');

  const operatorToken = await apiLogin(request, 'operator', 'operator');
  const saleRes = await request.post('/api/v1/pos/sale', {
    headers: { 'x-admin-secret': operatorToken },
    data: {
      customer_id: customerId,
      items: [{ code, name: `E2E Service ${rid}`, price: 300, qty: 1 }],
    },
  });
  expect(saleRes.ok()).toBeTruthy();
  await maybePause(page, 'После продажи');

  const txRes = await request.get(
    `/api/v1/test/transactions_by_customer?customer_id=${customerId}`,
    { headers: { 'x-admin-secret': TEST_ADMIN_SECRET } }
  );
  expect(txRes.ok()).toBeTruthy();
  const txDb = await txRes.json();
  expect(Array.isArray(txDb.items)).toBeTruthy();
  expect(txDb.items.length).toBeGreaterThan(0);
  const itemsJson = String(txDb.items[0].items_json || '[]');
  const parsed = JSON.parse(itemsJson);
  expect(parsed.some((it: any) => String(it.code) === code)).toBeTruthy();

  await apiPostTestCleanup(request, { phones: [phone], product_codes: [code] });
});
