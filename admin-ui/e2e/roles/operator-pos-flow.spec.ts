import { expect, login, test } from '../_shared';

test.describe('Operator POS Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'operator');
    await expect(page.getByTestId('admin_nav_customers')).toBeVisible({ timeout: 15000 });
  });

  test('operator sees allowed navigation tabs', async ({ page }) => {
    await expect(page.getByTestId('admin_nav_customers')).toBeVisible();
    await expect(page.getByTestId('admin_nav_pos')).toBeVisible();
  });

  test('operator can switch between allowed tabs', async ({ page }) => {
    const tabs = ['admin_nav_pos', 'admin_nav_customers'];
    for (const tab of tabs) {
      await page.getByTestId(tab).click();
      await expect(page.getByTestId(tab)).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('operator session persists after reload', async ({ page }) => {
    await page.reload();
    await expect(page.getByTestId('admin_nav_customers')).toBeVisible({ timeout: 10000 });
  });
});
