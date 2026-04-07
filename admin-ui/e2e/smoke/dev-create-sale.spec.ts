import { expect, expectAmountInMainOrSubunits, test } from '../_shared';

test('dev stack: admin can create sale from integrations simulator', async ({ page }) => {
  const runtimeEnv =
    (
      globalThis as typeof globalThis & {
        process?: { env?: Record<string, string | undefined> };
      }
    ).process?.env || {};
  const baseUrl = runtimeEnv.E2E_BASE_URL || 'http://localhost:5173';
  const apiBaseUrl = runtimeEnv.E2E_API_BASE_URL || 'http://localhost:8000';
  const loginResponse = await page
    .context()
    .request.post(`${apiBaseUrl}/api/v1/public/auth/login`, {
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

  const integrationsResponse = await page
    .context()
    .request.get(`${apiBaseUrl}/api/v1/integrations`, {
      headers: authHeaders,
    });
  expect(integrationsResponse.ok()).toBeTruthy();
  const integrationsData = await integrationsResponse.json();
  const posWebhook = (integrationsData.items || []).find(
    (item: { kind?: string; enabled?: boolean }) => item.kind === 'pos_webhook' && item.enabled
  );

  if (!posWebhook) {
    const createIntegrationResponse = await page
      .context()
      .request.post(`${apiBaseUrl}/api/v1/integrations`, {
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
  const createCustomerResponse = await page
    .context()
    .request.post(`${apiBaseUrl}/api/v1/customers`, {
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

  const saleResponse = await page.context().request.post(`${apiBaseUrl}/api/v1/pos/sale`, {
    headers: {
      ...authHeaders,
      'x-admin-secret': runtimeEnv.ADMIN_SECRET || 'test-secret-key',
    },
    data: {
      customer_id: createdCustomer.id,
      items: [{ code: 'E2E-DEV-SALE', name: 'Dev Sale Item', price: 630, qty: 1 }],
    },
  });
  expect(saleResponse.ok()).toBeTruthy();
  const sale = await saleResponse.json();
  expect(Number(sale.transaction_id)).toBeGreaterThan(0);

  const customerDetailsResponse = await page
    .context()
    .request.get(`${apiBaseUrl}/api/v1/customers/${createdCustomer.id}`, {
      headers: authHeaders,
    });
  expect(customerDetailsResponse.ok()).toBeTruthy();
  const customerDetails = await customerDetailsResponse.json();
  expect(Array.isArray(customerDetails.transactions)).toBeTruthy();
  expect(customerDetails.transactions.length).toBeGreaterThan(0);
  expectAmountInMainOrSubunits(customerDetails.transactions[0].total_amount, 630);
});
