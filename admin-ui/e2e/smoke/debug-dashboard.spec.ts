import { login, test } from '../_shared';

test('debug: check dashboard after login', async ({ page }) => {
  console.log('--- Start login process ---');

  // Go to root first
  await page.goto('/admin/');
  await page.waitForTimeout(2000);
  console.log('Root page loaded:', page.url());

  // Use the login helper
  await login(page, 'admin');

  // Wait for page to load
  await page.waitForTimeout(5000);

  // Take screenshot
  await page.screenshot({ fullPage: true, path: 'screenshots/debug-login-success.png' });

  // Log URL and title
  console.log('Current URL:', page.url());
  console.log('Page title:', await page.title());

  // Check if we're on dashboard
  if (!page.url().includes('dashboard')) {
    console.error('Not on dashboard page');
    const currentUrl = page.url();
    const bodyHtml = await page.locator('body').innerHTML();
    console.log('Current page content:', bodyHtml.substring(0, 1000));
  }

  // Check for dashboard elements
  const dashboardNav = page.getByTestId('admin_nav_dashboard_en');
  try {
    await dashboardNav.waitFor({ timeout: 5000 });
    console.log('Dashboard nav visible');
  } catch (e) {
    console.error('Dashboard nav not found');
  }

  // Check customers widget
  const customersWidget = page.getByTestId('admin_widget_customers_en');
  try {
    await customersWidget.waitFor({ timeout: 5000 });
    console.log('Customers widget visible');
  } catch (e) {
    console.error('Customers widget not found');
  }

  // Log all data-testids
  const allTestIds = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[data-testid]')).map((el) =>
      el.getAttribute('data-testid')
    );
  });

  console.log('All data-testids found:', allTestIds);

  // Check console for errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error(`[Browser console ERROR]: ${msg.text()}`);
    } else {
      console.log(`[Browser console] ${msg.type()}: ${msg.text()}`);
    }
  });

  page.on('pageerror', (err) => console.error(`[Page error]: ${err}`));
});
