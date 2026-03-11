import { attachConsole, expect, login, retryBackoff, TestIds, test } from '../_shared';

const consoleFlush = new Map<string, () => Promise<void>>();

test.beforeEach(async ({ page }, testInfo) => {
  page.on('console', (msg) => console.log(`[Browser] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', (err) => console.error(`[Browser] Uncaught exception: ${err.message}`));
  consoleFlush.set(testInfo.testId, attachConsole(page, testInfo));
  await retryBackoff(testInfo);
});

test.afterEach(async ({}, testInfo) => {
  const flush = consoleFlush.get(testInfo.testId);
  if (flush) await flush();
  consoleFlush.delete(testInfo.testId);
});

test('owner sees all tabs', async ({ page }) => {
  // Use TEST_CREDENTIALS instead of hardcoded passwords
  await login(page, 'admin');
  await page.waitForTimeout(2000);
  // Owner should see all tabs: Dashboard, Clients, Products, Sales, Marketing, Integrations, Settings
  // Using data-testid for stable, language-independent selectors
  await expect(page.getByTestId(TestIds.nav.dashboard)).toBeVisible();
  await expect(page.getByTestId(TestIds.nav.customers)).toBeVisible();
  await expect(page.getByTestId(TestIds.nav.products)).toBeVisible();
  await expect(page.getByTestId(TestIds.nav.pos)).toBeVisible();
  await expect(page.getByTestId(TestIds.nav.marketing)).toBeVisible();
  await expect(page.getByTestId(TestIds.nav.integrations)).toBeVisible();
  // Use exact match for Settings tab (not "Settings access")
  await expect(page.getByTestId(TestIds.nav.settings)).toBeVisible();
});

test('operator cannot see integrations', async ({ page }) => {
  await login(page, 'operator');
  await page.waitForTimeout(2000);
  // Operator sees Sales tab but not Integrations (using data-testid)
  await expect(page.getByTestId(TestIds.nav.pos)).toBeVisible();
  await expect(page.getByTestId(TestIds.nav.integrations)).toHaveCount(0);

  const apiBase = process.env.E2E_API_BASE_URL || 'http://127.0.0.1:8000';
  const resp = await page.request.get(`${apiBase}/api/v1/integrations`);
  // API returns 401 when user is authenticated but lacks permission
  expect([401, 403]).toContain(resp.status());
});

test('manager cannot see pos operations', async ({ page }) => {
  await login(page, 'manager');
  await page.waitForTimeout(2000);
  // Manager sees Integrations but not Sales (POS operations) - using data-testid
  await expect(page.getByTestId(TestIds.nav.integrations)).toBeVisible();
  await expect(page.getByTestId(TestIds.nav.pos)).toHaveCount(0);

  const apiBase = process.env.E2E_API_BASE_URL || 'http://127.0.0.1:8000';
  const resp = await page.request.post(`${apiBase}/api/v1/pos/sale`, {
    data: {
      customer_id: 1,
      items: [{ code: 'X', name: 'X', price: 1, qty: 1 }],
      requested_bonus: 0,
    },
  });
  // API returns 401 when user is authenticated but lacks permission
  expect([401, 403]).toContain(resp.status());
});
