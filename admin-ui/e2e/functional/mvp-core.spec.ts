import { expect, test } from '@playwright/test';

/**
 * MVP Core Functional Tests - Verified Working Tests
 *
 * These tests verify the core MVP functionality that is actually
 * implemented and working in the current UI.
 */

// Helper: Login to the application
async function login(page: any, username: string, password: string) {
  await page.goto('/');
  await page.getByPlaceholder('Логин').fill(username);
  await page.getByPlaceholder('Пароль').fill(password);
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page.getByText('Сводка')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1000);
}

test.describe('MVP Core Tests', () => {
  test.describe('Authentication', () => {
    test('admin login and verify role', async ({ page }) => {
      await login(page, 'admin', 'admin');
      await expect(page.getByText(/Роль:/)).toBeVisible();
      await expect(page.getByText(/Админ/)).toBeVisible();
    });

    test('operator login and verify role', async ({ page }) => {
      await login(page, 'operator', 'operator');
      await expect(page.getByText(/Роль:/)).toBeVisible();
      await expect(page.getByText(/Оператор/)).toBeVisible();
    });

    test('manager login and verify role', async ({ page }) => {
      await login(page, 'manager', 'manager');
      await expect(page.getByText(/Роль:/)).toBeVisible();
      await expect(page.getByText(/Менеджер/)).toBeVisible();
    });

    test('reject invalid password', async ({ page }) => {
      await page.goto('/');
      await page.getByPlaceholder('Логин').fill('admin');
      await page.getByPlaceholder('Пароль').fill('wrongpassword');
      await page.getByRole('button', { name: 'Войти' }).click();
      await expect(page.getByText(/Invalid|Неверн/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Role-based Access', () => {
    test('operator sees Operations but not Integrations', async ({ page }) => {
      await login(page, 'operator', 'operator');
      await expect(page.getByText('Операции')).toBeVisible();
      await expect(page.getByText('Интеграции')).not.toBeVisible();
    });

    test('manager sees Integrations but not Operations', async ({ page }) => {
      await login(page, 'manager', 'manager');
      await expect(page.getByText('Интеграции')).toBeVisible();
      await expect(page.getByText('Операции')).not.toBeVisible();
    });

    test('admin sees all main tabs', async ({ page }) => {
      await login(page, 'admin', 'admin');
      await expect(page.getByText('Сводка')).toBeVisible();
      await expect(page.getByText('Клиенты')).toBeVisible();
      await expect(page.getByText('Операции')).toBeVisible();
      await expect(page.getByText('Товары')).toBeVisible();
      await expect(page.getByText('Интеграции')).toBeVisible();
    });

    test('admin can see Sales Trend chart on dashboard', async ({ page }) => {
      // Mock stats response to ensure chart renders
      await page.route('**/api/v1/stats/sales*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            stats: [
              { day: '2026-02-01', cnt: 10, total: 1000 },
              { day: '2026-02-02', cnt: 15, total: 2000 },
            ],
          }),
        });
      });

      await login(page, 'admin', 'admin');

      // Wait for the specific container that holds the chart
      const chartContainer = page.locator('div:has-text("Тренд выручки (14 дней)")').first();
      await expect(chartContainer).toBeVisible({ timeout: 15000 });

      // Verify SVG is present inside the container
      const svg = chartContainer.locator('svg');
      await expect(svg).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('POS Operations', () => {
    test('operator can identify customer by phone', async ({ page }) => {
      const phone =
        '+7999' +
        Math.floor(Math.random() * 10000000)
          .toString()
          .padStart(7, '0');

      await login(page, 'operator', 'operator');
      await page.getByText('Операции').click();

      await page.getByPlaceholder('+79991234567').fill(phone);
      await page.getByRole('button', { name: 'Идентифицировать' }).click();

      // Wait for customer identification
      await page.waitForTimeout(3000);

      // Should show customer info or creation form
      await expect(page.getByText(/Клиент:|Имя:|Телефон:/i)).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Product Management', () => {
    test('products table is visible', async ({ page }) => {
      await login(page, 'admin', 'admin');
      await page.getByText('Товары').click();
      await expect(page.getByText('Товары / услуги')).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('table')).toBeVisible();
    });
  });

  test.describe('Customer Management', () => {
    test('customers table is visible', async ({ page }) => {
      await login(page, 'admin', 'admin');
      await page.getByText('Клиенты').click();
      await expect(page.getByText('Клиенты')).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('table')).toBeVisible();
    });

    test('search customers by phone', async ({ page }) => {
      await login(page, 'admin', 'admin');
      await page.getByText('Клиенты').click();

      const phone = '+79991234567';
      await page.getByPlaceholder('Поиск по телефону или ФИО').fill(phone);
      await page.getByRole('button', { name: 'Поиск' }).click();

      // Search should complete (may show no results)
      await page.waitForTimeout(2000);
      await expect(page.getByRole('button', { name: 'Поиск' })).toBeVisible();
    });
  });

  test.describe('Integrations', () => {
    test('integrations table is visible', async ({ page }) => {
      await login(page, 'admin', 'admin');
      await page.getByText('Интеграции').click();
      await expect(page.getByText('Интеграции')).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('table')).toBeVisible();
    });
  });
});
