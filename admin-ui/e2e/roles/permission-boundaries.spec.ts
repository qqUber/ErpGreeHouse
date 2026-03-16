import { expect, login, test } from '../_shared';

test.describe('Permission Boundaries', () => {
  test('admin sees full navigation set', async ({ page }) => {
    await login(page, 'admin');
    await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible();
    await expect(page.getByTestId('admin_nav_customers')).toBeVisible();
    await expect(page.getByTestId('admin_nav_pos')).toBeVisible();
    await expect(page.getByTestId('admin_nav_products')).toBeVisible();
    await expect(page.getByTestId('admin_nav_integrations')).toBeVisible();
    await expect(page.getByTestId('admin_nav_settings')).toBeVisible();
  });

  test('operator sees restricted navigation set', async ({ page }) => {
    await login(page, 'operator');
    await expect(page.getByTestId('admin_nav_customers')).toBeVisible();
    await expect(page.getByTestId('admin_nav_pos')).toBeVisible();
  });

  test('manager sees marketing navigation set', async ({ page }) => {
    await login(page, 'manager');
    await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible();
    await expect(page.getByTestId('admin_nav_customers')).toBeVisible();
    await expect(page.getByTestId('admin_nav_products')).toBeVisible();
    await expect(page.getByTestId('admin_nav_integrations')).toBeVisible();
  });

  test('unauthorized user is redirected to login', async ({ page }) => {
    await page.context().clearCookies();
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/admin/dashboard');
    await expect(page.getByTestId('common_input_username_en')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('common_input_password_en')).toBeVisible();
  });
});
