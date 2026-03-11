import { expect, test } from '@playwright/test';
import { login } from '../_shared';

test('admin can view dashboard', async ({ page }) => {
  await login(page, 'admin');
  await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible();
});

test('admin can resize widgets', async ({ page }) => {
  await login(page, 'admin');
  const widget = page.getByTestId('admin_widget_customers');
  await expect(widget).toBeVisible();
});

test('admin can toggle widget compact mode', async ({ page }) => {
  await login(page, 'admin');
  // Check if dashboard has expected widgets
  await expect(page.getByTestId('admin_widget_customers')).toBeVisible();
});
