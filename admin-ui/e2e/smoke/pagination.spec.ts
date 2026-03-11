import { attachConsole, expect, login, retryBackoff, TestIds, test } from '../_shared';

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

test('admin can open customers and run search', async ({ page }) => {
  await login(page, 'admin');
  await page.getByTestId(TestIds.nav.customers).click();
  await expect(page.getByTestId('customers_search_input_en')).toBeVisible();
  await page.getByTestId('customers_search_input_en').fill('test');
  await page.getByTestId('customers_search_button_en').click();
  await expect(page.getByTestId('customers_search_input_en')).toHaveValue('test');
});

test('admin can open products tab', async ({ page }) => {
  await login(page, 'admin');
  await page.getByTestId(TestIds.nav.products).click();
  await expect(page.getByTestId(TestIds.nav.products)).toBeVisible();
});
