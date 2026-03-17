import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('Accessibility Tests', () => {
  test('Login page accessibility - should have no critical violations', async ({ browser }) => {
    // Create a new browser context with no cookies or storage
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');

    // Run accessibility audit
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    await context.close();
  });

  test.skip('Form inputs accessibility - should have labels and accessible names', async ({
    browser,
  }) => {
    // Create a new browser context with no cookies or storage
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');

    // Click password login button to show form
    await page.getByTestId('common_btn_login_en').click();
    await page.waitForTimeout(1000);

    // Check login form inputs
    await expect(page.getByTestId('common_input_username_en')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('common_input_password_en')).toBeVisible({ timeout: 10000 });

    // Check password toggle button
    await expect(page.getByTestId('common_btn_toggle_password_en')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('common_btn_toggle_password_en')).toHaveAttribute('aria-label');

    await context.close();
  });
});
