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

test('admin can open customers tab', async ({ page }) => {
  await login(page, 'admin');
  await page.getByTestId('admin_nav_customers').click();
  await expect(page.getByTestId('admin_nav_customers')).toHaveAttribute('aria-selected', 'true');
});

test('admin can open products tab', async ({ page }) => {
  await login(page, 'admin');
  await page.getByTestId('admin_nav_products').click();
  await expect(page.getByTestId('admin_nav_products')).toHaveAttribute('aria-selected', 'true');
});
