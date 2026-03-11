import { expect, login, test } from '../_shared';

test('simple: login and see dashboard', async ({ page }) => {
  await login(page, 'admin');

  await page.waitForTimeout(3000);

  // Check if we're on the dashboard
  expect(page.url()).toContain('/admin');

  // Check for dashboard content
  const dashboard = page.getByTestId('admin-dashboard');
  await dashboard.waitFor({ timeout: 5000 });
  expect(dashboard).toBeVisible();

  const title = page.getByTestId('admin-dashboard-title');
  expect(title).toBeVisible();
  await expect(title).toContainText('Dashboard');
});
