import { expect, login, test } from '../_shared';

test.describe('Admin Full Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
    await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible({ timeout: 15000 });
  });

  test('admin navigation shell is available', async ({ page }) => {
    await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible();
    await expect(page.getByTestId('admin_nav_customers')).toBeVisible();
    await expect(page.getByTestId('admin_nav_pos')).toBeVisible();
    await expect(page.getByTestId('admin_nav_products')).toBeVisible();
    await expect(page.getByTestId('admin_nav_integrations')).toBeVisible();
    await expect(page.getByTestId('admin_nav_settings')).toBeVisible();
  });

  test('admin can switch core tabs', async ({ page }) => {
    const tabs = [
      'admin_nav_customers',
      'admin_nav_products',
      'admin_nav_integrations',
      'admin_nav_dashboard',
    ];
    for (const tab of tabs) {
      await page.getByTestId(tab).click();
      await expect(page.getByTestId(tab)).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('admin session persists after reload', async ({ page }) => {
    await page.reload();
    await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible({ timeout: 10000 });
  });

  test('admin can reset session', async ({ page }) => {
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await expect(page.getByTestId('common_input_username_en')).toBeVisible({ timeout: 10000 });
  });
});
