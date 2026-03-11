import { expect, login, test } from '../_shared';

test('capture screenshots with production data', async ({ page }) => {
  // Login as operator (not owner) - owner sees AdminDashboard with different layout
  await login(page, 'operator');

  // Wait for navigation to be ready using stable test id selector.
  await expect(page.getByTestId('admin_nav_dashboard_en')).toBeVisible({ timeout: 15000 });

  // Helper to capture page
  async function capturePage(tabText: string, fileName: string) {
    console.log(`Capturing ${tabText}...`);

    // Click tab (specifically target the tab element with exact text match)
    await page
      .locator('.tab')
      .filter({ hasText: new RegExp(`^${tabText}$`) })
      .click();
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({ fullPage: true, path: `screenshots/${fileName}` });
    console.log(`✓ Screenshot: ${fileName}`);
  }

  // Capture pages that operator has access to
  await capturePage('Dashboard', 'E2E-01-dashboard.png');
  await capturePage('Clients', 'E2E-02-customers.png');
  await capturePage('Products', 'E2E-03-products.png');
  await capturePage('Sales', 'E2E-04-sales.png');
  // Note: Operator may not have access to Marketing, Integrations, Settings, Compliance

  console.log('✅ All screenshots captured!');
});
