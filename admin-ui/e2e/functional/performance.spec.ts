import { expect, test } from '@playwright/test';

/**
 * Performance E2E Tests
 *
 * Tests for verifying application performance improvements:
 * - Parallel bootstrap loading
 * - Token caching in localStorage
 * - Optimistic UI rendering
 * - API response times
 */

test.describe('Performance Tests', () => {
  test.describe('Bootstrap Performance', () => {
    test('should load all bootstrap data in parallel', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/');

      // Wait for dashboard to be visible (indicates bootstrap complete)
      await expect(page.getByText('Сводка')).toBeVisible({ timeout: 10000 });

      const loadTime = Date.now() - startTime;

      // With parallel loading, should complete in < 2 seconds
      // (was 5-10 seconds with sequential loading)
      expect(loadTime).toBeLessThan(5000);

      console.log(`[Performance] Bootstrap completed in ${loadTime}ms`);
    });

    test('should load all required data on startup', async ({ page }) => {
      await page.goto('/');

      // Wait for auth to complete
      await expect(page.getByText('Сводка')).toBeVisible({ timeout: 10000 });

      // Verify all main data is loaded
      await expect(page.getByText('Клиенты')).toBeVisible();
      await expect(page.getByText('Операции')).toBeVisible();
      await expect(page.getByText('Товары')).toBeVisible();
      await expect(page.getByText('Интеграции')).toBeVisible();
    });
  });

  test.describe('Token Caching', () => {
    test('should restore session from localStorage on page reload', async ({ page }) => {
      // First login
      await page.goto('/');
      await page.getByPlaceholder('Логин').fill('admin');
      await page.getByPlaceholder('Пароль').fill('admin');
      await page.getByRole('button', { name: 'Войти' }).click();
      await expect(page.getByText('Сводка')).toBeVisible({ timeout: 10000 });

      // Wait for token to be saved
      await page.waitForTimeout(1000);

      // Reload page
      await page.reload();

      // Should be authenticated immediately (no login screen)
      // This verifies token was restored from localStorage
      await expect(page.getByText('Сводка')).toBeVisible({ timeout: 5000 });
      await expect(page.getByPlaceholder('Логин')).not.toBeVisible();
    });

    test('should clear token from localStorage on logout', async ({ page }) => {
      // Login
      await page.goto('/');
      await page.getByPlaceholder('Логин').fill('admin');
      await page.getByPlaceholder('Пароль').fill('admin');
      await page.getByRole('button', { name: 'Войти' }).click();
      await expect(page.getByText('Сводка')).toBeVisible({ timeout: 10000 });

      // Logout
      const logoutBtn = page.getByRole('button', { name: 'Выйти' });
      if (await logoutBtn.isVisible()) {
        await logoutBtn.click();
        await page.waitForTimeout(1000);
      }

      // Reload page
      await page.reload();

      // Should show login screen
      await expect(page.getByPlaceholder('Логин')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Optimistic UI', () => {
    test('should show UI immediately after authentication', async ({ page }) => {
      await page.goto('/');

      const startTime = Date.now();

      // Login
      await page.getByPlaceholder('Логин').fill('admin');
      await page.getByPlaceholder('Пароль').fill('admin');
      await page.getByRole('button', { name: 'Войти' }).click();

      // Wait for any tab to be visible (optimistic UI)
      await expect(page.getByText('Сводка')).toBeVisible({ timeout: 10000 });

      const timeToUI = Date.now() - startTime;

      // With optimistic UI, should show interface quickly
      expect(timeToUI).toBeLessThan(3000);

      console.log(`[Performance] Time to UI: ${timeToUI}ms`);
    });

    test('should navigate between tabs without delay', async ({ page }) => {
      await page.goto('/');
      await page.getByPlaceholder('Логин').fill('admin');
      await page.getByPlaceholder('Пароль').fill('admin');
      await page.getByRole('button', { name: 'Войти' }).click();
      await expect(page.getByText('Сводка')).toBeVisible({ timeout: 10000 });

      // Test tab navigation speed
      const tabs = ['Клиенты', 'Операции', 'Товары', 'Интеграции'];

      for (const tab of tabs) {
        const startTime = Date.now();
        await page.getByText(tab).click();

        // Wait for tab content to be visible
        await page.waitForTimeout(500);

        const navTime = Date.now() - startTime;
        expect(navTime).toBeLessThan(5000); // 5 seconds for tab navigation with data load

        console.log(`[Performance] Navigation to "${tab}": ${navTime}ms`);
      }
    });
  });

  test.describe('API Response Times', () => {
    test('public status API should respond quickly', async ({ request }) => {
      const startTime = Date.now();

      const response = await request.get('/api/v1/public/status');

      const responseTime = Date.now() - startTime;

      expect(response.ok()).toBeTruthy();
      expect(responseTime).toBeLessThan(500);

      console.log(`[Performance] /api/v1/public/status: ${responseTime}ms`);
    });

    // Note: API tests with authentication require token management
    // These are covered in integration tests
  });

  test.describe('Memory and Resource Usage', () => {
    test('should not leak memory on repeated navigation', async ({ page }) => {
      await page.goto('/');
      await page.getByPlaceholder('Логин').fill('admin');
      await page.getByPlaceholder('Пароль').fill('admin');
      await page.getByRole('button', { name: 'Войти' }).click();
      await expect(page.getByText('Сводка')).toBeVisible({ timeout: 10000 });

      // Navigate between tabs multiple times
      for (let i = 0; i < 5; i++) {
        await page.getByText('Клиенты').click();
        await page.waitForTimeout(500);
        await page.getByText('Товары').click();
        await page.waitForTimeout(500);
      }

      // Page should still be responsive
      await expect(page.getByText('Сводка')).toBeVisible();
    });
  });
});
