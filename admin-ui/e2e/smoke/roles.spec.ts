import { attachConsole, expect, login, retryBackoff, test } from '../_shared';

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
  await expect(page.getByText('Dashboard', { exact: true })).toBeVisible();
  await expect(page.getByText('Clients', { exact: true })).toBeVisible();
  await expect(page.getByText('Products', { exact: true })).toBeVisible();
  await expect(page.getByText('Sales', { exact: true })).toBeVisible();
  await expect(page.getByText('Marketing', { exact: true })).toBeVisible();
  await expect(page.getByText('Integrations', { exact: true })).toBeVisible();
  // Use exact match for Settings tab (not "Settings access")
  await expect(page.getByText('Settings', { exact: true })).toBeVisible();
});

test('operator cannot see integrations', async ({ page }) => {
  await login(page, 'operator');
  await page.waitForTimeout(2000);
  // Operator sees Sales tab but not Integrations
  await expect(page.getByText('Sales', { exact: true })).toBeVisible();
  await expect(page.getByText('Integrations', { exact: true })).toHaveCount(0);

  const resp = await page.request.get('/api/v1/integrations');
  // API returns 401 when user is authenticated but lacks permission
  expect([401, 403]).toContain(resp.status());
});

test('manager cannot see pos operations', async ({ page }) => {
  await login(page, 'manager');
  await page.waitForTimeout(2000);
  // Manager sees Integrations but not Sales (POS operations)
  await expect(page.getByText('Integrations', { exact: true })).toBeVisible();
  await expect(page.getByText('Sales', { exact: true })).toHaveCount(0);

  const resp = await page.request.post('/api/v1/pos/sale', {
    data: {
      customer_id: 1,
      items: [{ code: 'X', name: 'X', price: 1, qty: 1 }],
      requested_bonus: 0,
    },
  });
  // API returns 401 when user is authenticated but lacks permission
  expect([401, 403]).toContain(resp.status());
});
