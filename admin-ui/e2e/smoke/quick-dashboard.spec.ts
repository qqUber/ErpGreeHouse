import { expect, login, test } from '../_shared';

test('quick: login and check dashboard', async ({ page }) => {
  await login(page, 'admin');

  await page.waitForTimeout(3000);

  // Check dashboard title
  const title = page.getByTestId('admin-dashboard-title');
  await title.waitFor({ timeout: 5000 });
  expect(title).toBeVisible();
  await expect(title).toContainText('Dashboard');

  console.log('Title found');

  // Check dashboard container
  const dashboard = page.getByTestId('admin-dashboard');
  await dashboard.waitFor({ timeout: 3000 });
  expect(dashboard).toBeVisible();

  console.log('Dashboard container found');
});
