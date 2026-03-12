import { expect, test } from '@playwright/test';

test('quick: login flow', async ({ page }) => {
  await page.goto('/admin/');

  await page.waitForTimeout(2000);

  // Check login form is visible
  const loginForm = page.getByTestId('common_input_username_en');
  await loginForm.waitFor({ timeout: 5000 });
  expect(loginForm).toBeVisible();

  // Enter credentials
  await loginForm.fill('admin');

  const passwordInput = page.getByTestId('common_input_password_en');
  await passwordInput.fill('TestPass123!');

  const loginButton = page.getByTestId('common_btn_login_en');
  await loginButton.click();

  await page.waitForURL(/\/admin\/?$/, { timeout: 10000 });
  await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible({ timeout: 10000 });

  expect(page.url()).toContain('/admin/');
  expect(page.url()).not.toContain('login');
});
