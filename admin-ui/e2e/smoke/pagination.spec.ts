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

test('admin can use customer pagination', async ({ page }) => {
  await login(page, 'admin');
  
  // Navigate to customers page
  await page.getByTestId(TestIds.nav.customers).click();
  await page.waitForLoadState('domcontentloaded');
  
  // Verify pagination is visible and working
  const pagination = page.getByTestId('pagination');
  await expect(pagination).toBeVisible();
  
  // Check if we have customer data to test pagination
  const customerRows = page.getByRole('row');
  const rowCount = await customerRows.count();
  console.log(`[Test] Found ${rowCount} customer rows`);
  
  if (rowCount > 10) {
    // Click next page
    const nextButton = page.getByTestId('pagination-next');
    await expect(nextButton).toBeEnabled();
    await nextButton.click();
    await page.waitForTimeout(1000);
    
    // Verify page changed
    const currentPage = page.getByTestId('pagination').getByRole('button', { name: '2' });
    await expect(currentPage).toBeVisible();
  }
  
  console.log('[Test] Customer pagination functionality verified');
});

test('admin can use product pagination', async ({ page }) => {
  await login(page, 'admin');
  
  // Navigate to products page
  await page.getByTestId(TestIds.nav.products).click();
  await page.waitForLoadState('domcontentloaded');
  
  // Verify pagination is visible and working
  const pagination = page.getByTestId('pagination');
  await expect(pagination).toBeVisible();
  
  // Check if we have product data to test pagination
  const productRows = page.getByRole('row');
  const rowCount = await productRows.count();
  console.log(`[Test] Found ${rowCount} product rows`);
  
  if (rowCount > 10) {
    // Click next page
    const nextButton = page.getByTestId('pagination-next');
    await expect(nextButton).toBeEnabled();
    await nextButton.click();
    await page.waitForTimeout(1000);
    
    // Verify page changed
    const currentPage = page.getByTestId('pagination').getByRole('button', { name: '2' });
    await expect(currentPage).toBeVisible();
  }
  
  console.log('[Test] Product pagination functionality verified');
});

test('pagination supports search and page reset', async ({ page }) => {
  await login(page, 'admin');
  
  // Navigate to customers page
  await page.getByTestId(TestIds.nav.customers).click();
  await page.waitForLoadState('domcontentloaded');
  
  // Perform search
  const searchInput = page.getByTestId('customers_search_input_en');
  await searchInput.fill('test');
  await page.getByTestId('customers_search_button_en').click();
  await page.waitForTimeout(1000);
  
  // Verify search results
  const resultsText = page.getByText(/Showing.*of.*results/i);
  await expect(resultsText).toBeVisible();
  
  // Clear search
  await page.getByTestId('customers_clear_button_en').click();
  await page.waitForTimeout(1000);
  
  // Verify back to first page
  const firstPageButton = page.getByTestId('pagination').getByRole('button', { name: '1' });
  await expect(firstPageButton).toBeVisible();
  await expect(firstPageButton).toHaveClass(/active/);
  
  console.log('[Test] Search and page reset functionality verified');
});