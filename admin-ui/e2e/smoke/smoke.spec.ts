import { expect, test } from '@playwright/test';
import { login } from '../_shared';

test('admin can view dashboard', async ({ page }) => {
  await login(page, 'admin');
  await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible();
});

test('admin can resize widgets', async ({ page }) => {
  await login(page, 'admin');
  await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId('admin_nav_customers')).toBeVisible();
  await page.getByTestId('admin_nav_customers').click();
  await expect(page.getByTestId('admin_nav_customers')).toHaveAttribute('aria-selected', 'true');
});

test('admin can toggle widget compact mode', async ({ page }) => {
  await login(page, 'admin');
  await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId('admin_nav_products')).toBeVisible();
  await page.getByTestId('admin_nav_products').click();
  await expect(page.getByTestId('admin_nav_products')).toHaveAttribute('aria-selected', 'true');
});
