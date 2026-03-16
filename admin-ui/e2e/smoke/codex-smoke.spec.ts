import { expect, test } from '@playwright/test';

const APP_BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:5173/admin/';
const API_BASE = process.env.E2E_API_BASE_URL || 'http://127.0.0.1:8000';

test('codex smoke: frontend renders login and backend auth is reachable', async ({ page }) => {
  await page.goto(APP_BASE, { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveTitle(/Coffee CRM Admin/i);
  await expect(page.getByTestId('common_input_username_en')).toBeVisible();
  await expect(page.getByTestId('common_input_password_en')).toBeVisible();
  await expect(page.getByTestId('common_btn_login_en')).toBeVisible();

  const health = await page.request.get(`${API_BASE}/health`);
  expect(health.status()).toBe(200);

  const login = await page.request.post(`${API_BASE}/api/v1/public/auth/login`, {
    data: { username: 'admin', password: 'admin' },
  });
  expect(login.status()).toBe(200);
});
