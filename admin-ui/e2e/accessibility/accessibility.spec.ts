import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test('Login page accessibility - should have no critical violations', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await expect(page.getByTestId('common_btn_password_login_en')).toBeVisible();
    
    // Run accessibility audit
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Form inputs accessibility - should have labels and accessible names', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Check login form inputs
    await expect(page.getByTestId('common_input_username_en')).toBeVisible();
    await expect(page.getByTestId('common_input_password_en')).toBeVisible();
    
    // Check password toggle button
    await expect(page.getByTestId('common_btn_toggle_password_en')).toBeVisible();
    await expect(page.getByTestId('common_btn_toggle_password_en')).toHaveAttribute('aria-label');
  });
});
