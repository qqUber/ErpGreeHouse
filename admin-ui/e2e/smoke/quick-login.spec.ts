import { expect, login, test } from '../_shared';

test('quick: login and check dashboard', async ({ page }) => {
  await login(page, 'admin');

  // Wait for page to load
  await page.waitForTimeout(3000);

  // Check if login succeeded
  const currentUrl = page.url();
  console.log('Current URL:', currentUrl);

  expect(currentUrl).toContain('/admin');

  // Check for dashboard content
  const dashboardElement = page.getByTestId('admin_nav_dashboard');
  await dashboardElement.waitFor({ timeout: 5000 });

  await expect(dashboardElement).toBeVisible();
});
