import { expect, test } from '@playwright/test';

const API_BASE = process.env.E2E_API_BASE_URL || 'http://backend:8000';
const WEB_BASE = process.env.E2E_BASE_URL || 'http://frontend:5173';

async function getAuthToken(request: any, username: string, password: string) {
  const res = await request.post(`${WEB_BASE}/api/v1/public/auth/login`, {
    data: { username, password },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return String(body.token || '');
}

async function ensureEnvReady() {
  const health = await fetch(`${API_BASE}/health`);
  expect(health.ok).toBeTruthy();
  const status = await fetch(`${WEB_BASE}/api/v1/public/status`);
  expect(status.ok).toBeTruthy();
}

test('manual client creation', async ({ page, request }) => {
  test.setTimeout(120000);
  const phone =
    '7999' +
    Math.floor(Math.random() * 10000000)
      .toString()
      .padStart(7, '0');
  const name = 'Manual Client ' + Date.now();

  await ensureEnvReady();
  await page.goto('/');
  await page.getByTestId('common_input_username_en').fill('admin');
  await page.getByTestId('common_input_password_en').fill('admin');
  await page.getByTestId('common_btn_login_en').click();

  // Wait for dashboard to load
  await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible();
  // Wait until auth overlay finishes
  await page.waitForSelector('.overlay', { state: 'hidden', timeout: 60000 });

  // Check role - wait for it to load
  // await expect(page.getByText(/Роль:/)).toBeVisible({ timeout: 10000 })
  // await expect(page.getByText(/Админ/i)).toBeVisible()

  const ownerToken = await getAuthToken(request, 'admin', 'admin');
  const createClientRes = await request.post('/api/v1/customers', {
    headers: { 'x-admin-secret': ownerToken },
    data: { full_name: name, phone: `+${phone}`, notes: 'Test notes' },
  });
  expect(createClientRes.ok()).toBeTruthy();
  const createClientPayload = await createClientRes.json();
  expect(Number(createClientPayload.id || 0)).toBeGreaterThan(0);

  await page.getByTestId('admin_nav_customers').click();
  await expect(page.getByTestId('admin_nav_customers')).toHaveAttribute('aria-selected', 'true');
});

test('products tab access smoke', async ({ page }) => {
  test.setTimeout(120000);
  await ensureEnvReady();
  await page.goto('/');
  await page.getByTestId('common_input_username_en').fill('admin');
  await page.getByTestId('common_input_password_en').fill('admin');
  await page.getByTestId('common_btn_login_en').click();
  await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible();
  await page.waitForSelector('.overlay', { state: 'hidden', timeout: 60000 });
  await page.getByTestId('admin_nav_products').click();
  await expect(page.getByTestId('admin_nav_products')).toHaveAttribute('aria-selected', 'true');
});
