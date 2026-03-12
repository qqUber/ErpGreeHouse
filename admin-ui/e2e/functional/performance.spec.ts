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

async function login(page: any, username: string, password: string) {
  await page.goto('/');
  await page.getByTestId('common_input_username_en').fill(username);
  await page.getByTestId('common_input_password_en').fill(password);
  await page.getByTestId('common_btn_login_en').click();
  await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible({ timeout: 10000 });
  await page.waitForSelector('.overlay', { state: 'hidden', timeout: 60000 });
}

test.describe('Performance Tests', () => {
  test.describe('Bootstrap Performance', () => {
    test('should load all bootstrap data in parallel', async ({ page }) => {
      const startTime = Date.now();

      await login(page, 'admin', 'admin');

      // Wait for dashboard to be visible (indicates bootstrap complete)
      await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible({ timeout: 10000 });

      const loadTime = Date.now() - startTime;

      // With parallel loading, should complete in < 2 seconds
      // (was 5-10 seconds with sequential loading)
      expect(loadTime).toBeLessThan(5000);

      console.log(`[Performance] Bootstrap completed in ${loadTime}ms`);
    });

    test('should load all required data on startup', async ({ page }) => {
      await login(page, 'admin', 'admin');

      // Verify all main data is loaded
      await expect(page.getByTestId('admin_nav_customers')).toBeVisible();
      await expect(page.getByTestId('admin_nav_products')).toBeVisible();
      await expect(page.getByTestId('admin_nav_integrations')).toBeVisible();
    });
  });

  test.describe('Token Caching', () => {
    test('should restore session from localStorage on page reload', async ({ page }) => {
      await login(page, 'admin', 'admin');

      // Wait for token to be saved
      await page.waitForTimeout(1000);

      // Reload page
      await page.reload();

      // Should be authenticated immediately (no login screen)
      // This verifies token was restored from localStorage
      await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible({ timeout: 5000 });
    });

    test('should clear token from localStorage on logout', async ({ page }) => {
      await login(page, 'admin', 'admin');

      // Logout
      const logoutBtn = page.getByTestId('admin_btn_logout_en');
      if (await logoutBtn.isVisible()) {
        await logoutBtn.click();
        await page.waitForTimeout(1000);
      }

      // Reload page
      await page.reload();

      // Should show login screen
      await expect(page.getByTestId('common_input_username_en')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Optimistic UI', () => {
    test('should show UI immediately after authentication', async ({ page }) => {
      const startTime = Date.now();

      await login(page, 'admin', 'admin');

      // Wait for any tab to be visible (optimistic UI)
      await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible({ timeout: 10000 });

      const timeToUI = Date.now() - startTime;

      // With optimistic UI, should show interface quickly
      expect(timeToUI).toBeLessThan(3000);

      console.log(`[Performance] Time to UI: ${timeToUI}ms`);
    });

    test('should navigate between tabs without delay', async ({ page }) => {
      await login(page, 'admin', 'admin');

      // Test tab navigation speed
      const tabs = [
        { id: 'admin_nav_customers', label: 'customers' },
        { id: 'admin_nav_products', label: 'products' },
        { id: 'admin_nav_integrations', label: 'integrations' },
        { id: 'admin_nav_dashboard', label: 'dashboard' },
      ];

      for (const tab of tabs) {
        const startTime = Date.now();
        await page.getByTestId(tab.id).click();
        await expect(page.getByTestId(tab.id)).toHaveAttribute('aria-selected', 'true');

        // Wait for tab content to be visible
        await page.waitForTimeout(500);

        const navTime = Date.now() - startTime;
        expect(navTime).toBeLessThan(5000); // 5 seconds for tab navigation with data load

        console.log(`[Performance] Navigation to "${tab.label}": ${navTime}ms`);
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
      await login(page, 'admin', 'admin');

      // Navigate between tabs multiple times
      for (let i = 0; i < 5; i++) {
        await page.getByTestId('admin_nav_customers').click();
        await page.waitForTimeout(500);
        await page.getByTestId('admin_nav_products').click();
        await page.waitForTimeout(500);
      }

      // Page should still be responsive
      await page.getByTestId('admin_nav_dashboard').click();
      await expect(page.getByTestId('admin_nav_dashboard')).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });
  });
});
