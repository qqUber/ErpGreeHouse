import { expect, login, test } from '../_shared';

test('quick: check navigation', async ({ page }) => {
  await login(page, 'admin');

  await page.waitForTimeout(3000);

  const dashboardNav = page.getByTestId('admin_nav_dashboard_en');
  await dashboardNav.waitFor({ timeout: 5000 });

  expect(dashboardNav).toBeVisible();
  console.log('Dashboard nav found');

  const customersNav = page.getByTestId('admin_nav_customers_en');
  await customersNav.waitFor({ timeout: 5000 });

  expect(customersNav).toBeVisible();
  console.log('Customers nav found');

  const productsNav = page.getByTestId('admin_nav_products_en');
  await productsNav.waitFor({ timeout: 5000 });

  expect(productsNav).toBeVisible();
  console.log('Products nav found');

  const integrationsNav = page.getByTestId('admin_nav_integrations_en');
  await integrationsNav.waitFor({ timeout: 5000 });

  expect(integrationsNav).toBeVisible();
  console.log('Integrations nav found');

  const complianceNav = page.getByTestId('admin_nav_compliance_en');
  await complianceNav.waitFor({ timeout: 5000 });

  expect(complianceNav).toBeVisible();
  console.log('Compliance nav found');
});
