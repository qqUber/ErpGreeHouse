import { expect, test } from '@playwright/test';

test('simple: login through UI', async ({ page }) => {
  await page.goto('/admin/');

  await page.waitForTimeout(2000);

  // Fill in credentials
  await page.getByTestId('common_input_username_en').fill('admin');
  await page.getByTestId('common_input_password_en').fill('TestPass123!');

  // Click login
  await page.getByTestId('common_btn_login_en').click();

  // Wait for SPA transition to authenticated shell
  await page.waitForURL(/\/admin\/?$/, { timeout: 10000 });
  await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible({ timeout: 10000 });

  // Check authenticated shell URL
  expect(page.url()).toContain('/admin/');

  // Check dashboard tab is available
  await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible();
});
