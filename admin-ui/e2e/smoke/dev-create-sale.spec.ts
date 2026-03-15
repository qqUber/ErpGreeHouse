import { expect, login, test } from '../_shared';

test('dev stack: admin can create sale from integrations simulator', async ({ page }) => {
  const runtimeEnv =
    (globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    }).process?.env || {};
  const baseUrl = runtimeEnv.E2E_BASE_URL || 'http://localhost:5173';
  const apiBaseUrl = runtimeEnv.E2E_API_BASE_URL || 'http://localhost:8000';
  const loginResponse = await page.context().request.post(`${apiBaseUrl}/api/v1/public/auth/login`, {
    data: { username: 'admin', password: 'admin' },
  });

  expect(loginResponse.ok()).toBeTruthy();
  const authData = await loginResponse.json();
  const token = authData.token || authData.access_token;
  expect(token).toBeTruthy();

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const integrationsResponse = await page.context().request.get(`${apiBaseUrl}/api/v1/integrations`, {
    headers: authHeaders,
  });
  expect(integrationsResponse.ok()).toBeTruthy();
  const integrationsData = await integrationsResponse.json();
  const posWebhook = (integrationsData.items || []).find(
    (item: { kind?: string; enabled?: boolean }) => item.kind === 'pos_webhook' && item.enabled
  );

  if (!posWebhook) {
    const createIntegrationResponse = await page.context().request.post(`${apiBaseUrl}/api/v1/integrations`, {
      headers: authHeaders,
      data: {
        name: 'E2E POS Webhook',
        kind: 'pos_webhook',
        enabled: true,
        config: {},
      },
    });
    expect(createIntegrationResponse.ok()).toBeTruthy();
  }

  const uniquePhone = `+7999${Date.now().toString().slice(-7)}`;
  const createCustomerResponse = await page.context().request.post(`${apiBaseUrl}/api/v1/customers`, {
    headers: authHeaders,
    data: {
      full_name: 'Playwright Dev Sale',
      phone: uniquePhone,
    },
  });
  expect(createCustomerResponse.ok()).toBeTruthy();
  const createdCustomer = await createCustomerResponse.json();
  expect(createdCustomer.id).toBeTruthy();
  expect(createdCustomer.qr_token).toBeTruthy();

  await login(page, 'admin');
  await expect(page.getByTestId('admin_nav_integrations')).toBeVisible({ timeout: 15000 });
  await page.getByTestId('admin_nav_integrations').click();
  await expect(page.getByTestId('admin_nav_integrations')).toHaveAttribute('aria-selected', 'true');
  const webhooksTab = page.getByTestId('admin_tab_webhooks_en');
  if (await webhooksTab.count()) {
    await webhooksTab.first().click();
  }
  await expect(page.getByTestId('admin_dev_create_sale_panel')).toBeVisible({ timeout: 15000 });

  await page.getByTestId('admin_input_dev_customer_qr').fill(createdCustomer.qr_token);
  await page.getByTestId('admin_btn_dev_create_sale').click();
  await expect(page.getByText(new RegExp(`Sale created: tx #\\d+, customer #${createdCustomer.id}`))).toBeVisible({
    timeout: 15000,
  });

  const customerDetailsResponse = await page.context().request.get(
    `${apiBaseUrl}/api/v1/customers/${createdCustomer.id}`,
    {
      headers: authHeaders,
    }
  );
  expect(customerDetailsResponse.ok()).toBeTruthy();
  const customerDetails = await customerDetailsResponse.json();
  expect(Array.isArray(customerDetails.transactions)).toBeTruthy();
  expect(customerDetails.transactions.length).toBeGreaterThan(0);
  expect(customerDetails.transactions[0].total_amount).toBe(630);
});
