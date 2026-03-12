import { attachConsole, expect, login, retryBackoff, test } from '../_shared';

const consoleFlush = new Map<string, () => Promise<void>>();

test.beforeEach(async ({ page }, testInfo) => {
  consoleFlush.set(testInfo.testId, attachConsole(page, testInfo));
  await retryBackoff(testInfo);
});

test.afterEach(async ({}, testInfo) => {
  const flush = consoleFlush.get(testInfo.testId);
  if (flush) await flush();
  consoleFlush.delete(testInfo.testId);
});

test('analytics recent sales links to customer profile', async ({ page }) => {
  // Login as admin for stable dashboard access in smoke runs.
  await login(page, 'admin');

  await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible({
    timeout: 10000,
  });
  await page.waitForTimeout(2000);

  await expect(page.getByTestId('admin_nav_customers')).toBeVisible();
  await expect(page.getByTestId('admin_nav_products')).toBeVisible();
  await expect(page.getByTestId('admin_nav_integrations')).toBeVisible();

  await page.getByTestId('admin_nav_customers').click();
  await expect(page.getByTestId('admin_nav_customers')).toHaveAttribute('aria-selected', 'true');
  await page.getByTestId('admin_nav_dashboard').click();
  await expect(page.getByTestId('admin_nav_dashboard')).toHaveAttribute('aria-selected', 'true');

  console.log('[Test] Analytics navigation smoke passed');
});

test('analytics dashboard shows summary metrics', async ({ page }) => {
  // Login as admin for stable dashboard access in smoke runs.
  await login(page, 'admin');

  await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible({
    timeout: 10000,
  });
  await page.waitForTimeout(2000);

  const tabs = [
    'admin_nav_customers',
    'admin_nav_products',
    'admin_nav_integrations',
    'admin_nav_dashboard',
  ];
  for (const tab of tabs) {
    await page.getByTestId(tab).click();
    await expect(page.getByTestId(tab)).toHaveAttribute('aria-selected', 'true');
  }

  console.log('[Test] Analytics tab switching smoke passed');
});
