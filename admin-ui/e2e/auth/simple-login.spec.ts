import { test } from '@playwright/test';

test('simple: login through UI', async ({ page }) => {
  await page.goto('/admin/');

  await page.waitForTimeout(2000);

  // Fill in credentials
  await page.getByTestId('common_input_username_en').fill('admin');
  await page.getByTestId('common_input_password_en').fill('TestPass123!');

  // Click login
  await page.getByTestId('common_btn_login_en').click();

  // Wait for navigation
  await page.waitForNavigation({ timeout: 10000 });

  // Check if we're on dashboard
  expect(page.url()).toContain('dashboard');

  // Check dashboard content
  const title = page.getByTestId('admin-dashboard-title');
  await title.waitFor({ timeout: 5000 });
  expect(title).toBeVisible();
});
