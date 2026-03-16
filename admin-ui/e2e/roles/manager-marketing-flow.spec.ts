import { expect, login, test } from '../_shared';

test.describe('Manager Marketing Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'manager');
    await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible({ timeout: 15000 });
  });

  test('manager sees allowed navigation tabs', async ({ page }) => {
    await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible();
    await expect(page.getByTestId('admin_nav_customers')).toBeVisible();
    await expect(page.getByTestId('admin_nav_products')).toBeVisible();
    await expect(page.getByTestId('admin_nav_integrations')).toBeVisible();
  });

  test('manager can switch core tabs', async ({ page }) => {
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

  test('manager session persists after reload', async ({ page }) => {
    await page.reload();
    await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible({ timeout: 10000 });
  });
});
