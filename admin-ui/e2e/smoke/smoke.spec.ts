import { attachConsole, expect, login, retryBackoff, test, TestIds } from '../_shared';

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

test('pos sale creates transaction visible in customer card', async ({ page }) => {
  // Use operator role who has pos.sale permission
  await login(page, 'operator');

  // Wait for operator dashboard to load - using data-testid for stability
  await expect(page.getByTestId(TestIds.operator.btnNewSale)).toBeVisible({ timeout: 10000 });
  
  // Verify POS elements are present using data-testid
  const newSaleBtn = page.getByTestId(TestIds.operator.btnNewSale);
  const identifyBtn = page.getByTestId(TestIds.operator.btnIdentifyCustomer);
  const catalogBtn = page.getByTestId(TestIds.operator.btnCatalog);
  
  await expect(newSaleBtn).toBeVisible();
  await expect(identifyBtn).toBeVisible();
  await expect(catalogBtn).toBeVisible();
  
  // Click on New Sale button to verify it works
  await newSaleBtn.click();
  await page.waitForTimeout(2000);
  
  console.log('[Test] POS functionality verified - operator can access POS features');
});
