import { expect, login, test } from '../_shared';

test('simple: login and see dashboard', async ({ page }) => {
  await login(page, 'admin');

  await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId('admin_nav_customers')).toBeVisible();
  await expect(page.getByTestId('admin_nav_products')).toBeVisible();

  await page.getByTestId('admin_nav_customers').click();
  await expect(page.getByTestId('admin_nav_customers')).toHaveAttribute('aria-selected', 'true');
  await page.getByTestId('admin_nav_dashboard').click();
  await expect(page.getByTestId('admin_nav_dashboard')).toHaveAttribute('aria-selected', 'true');
});
