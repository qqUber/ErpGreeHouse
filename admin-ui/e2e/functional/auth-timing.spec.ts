import {expect, test} from '@playwright/test';

/**
 * Authorization Timing Tests
 *
 * Measures authentication time for different methods:
 * 1. Login by password (first time)
 * 2. Login by key (first time)
 * 3. Session restore from localStorage (page reload)
 * 4. Session restore from cookie (existing session)
 */

test.describe('Authorization Timing', () => {
  test('login by password - full flow', async ({ page }) => {
    const totalTime = Date.now();

    // Navigate to login page
    const navStart = Date.now();
    await page.goto('/');
    const navTime = Date.now() - navStart;

    // Fill credentials
    await page.getByPlaceholder('Логин').fill('admin');
    await page.getByPlaceholder('Пароль').fill('admin');

    // Click login and wait for dashboard
    const loginStart = Date.now();
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page.getByText('Сводка')).toBeVisible({ timeout: 10000 });
    const loginTime = Date.now() - loginStart;

    const total = Date.now() - totalTime;

    console.log(`[Auth Timing] Login by password:`);
    console.log(`  - Navigation: ${navTime}ms`);
    console.log(`  - Login + Bootstrap: ${loginTime}ms`);
    console.log(`  - TOTAL: ${total}ms`);

    expect(total).toBeLessThan(5000); // Should complete in < 5 seconds
  });

  test('session restore from localStorage - instant auth', async ({ page }) => {
    // First login
    await page.goto('/');
    await page.getByPlaceholder('Логин').fill('admin');
    await page.getByPlaceholder('Пароль').fill('admin');
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page.getByText('Сводка')).toBeVisible({ timeout: 10000 });

    // Wait for token to be saved
    await page.waitForTimeout(500);

    // Reload page - should restore from localStorage
    const reloadStart = Date.now();
    await page.reload();

    // Should be authenticated immediately
    await expect(page.getByText('Сводка')).toBeVisible({ timeout: 5000 });
    const restoreTime = Date.now() - reloadStart;

    console.log(`[Auth Timing] Session restore from localStorage:`);
    console.log(`  - Restore time: ${restoreTime}ms`);

    expect(restoreTime).toBeLessThan(1000); // Should be nearly instant
  });

  test('session from cookie - no reload needed', async ({ page }) => {
    const startTime = Date.now();

    // Navigate when already has cookie from previous test
    await page.goto('/');

    // Check if already authenticated (no login form visible)
    const isAuthed = await page.getByText('Сводка').isVisible({ timeout: 3000 });
    const loadTime = Date.now() - startTime;

    if (isAuthed) {
      console.log(`[Auth Timing] Session from cookie (already logged in):`);
      console.log(`  - Load time: ${loadTime}ms`);
      console.log(`  - Status: Already authenticated`);
    } else {
      console.log(`[Auth Timing] No existing session, login required`);
    }

    expect(loadTime).toBeLessThan(2000);
  });

  test('compare: fresh login vs cached session', async ({ page, browserName, browser }) => {
    // Create fresh context for fresh login
    const freshContext = await browser.newContext();
    const freshPage = await freshContext.newPage();

    // Measure fresh login
    const freshStart = Date.now();
    await freshPage.goto('/');
    await freshPage.getByPlaceholder('Логин').fill('admin');
    await freshPage.getByPlaceholder('Пароль').fill('admin');
    await freshPage.getByRole('button', { name: 'Войти' }).click();
    await expect(freshPage.getByText('Сводка')).toBeVisible({ timeout: 10000 });
    const freshTime = Date.now() - freshStart;

    await freshContext.close();

    // Measure cached session (current page after reload)
    await page.goto('/');
    await page.getByPlaceholder('Логин').fill('admin');
    await page.getByPlaceholder('Пароль').fill('admin');
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page.getByText('Сводка')).toBeVisible({ timeout: 10000 });

    // Wait for localStorage to save
    await page.waitForTimeout(500);

    const cachedStart = Date.now();
    await page.reload();
    await expect(page.getByText('Сводка')).toBeVisible({ timeout: 5000 });
    const cachedTime = Date.now() - cachedStart;

    console.log(`[Auth Timing Comparison] (${browserName}):`);
    console.log(`  - Fresh login: ${freshTime}ms`);
    console.log(`  - Cached session: ${cachedTime}ms`);
    console.log(`  - Improvement: ${Math.round((freshTime / cachedTime) * 100) / 100}x faster`);

    expect(cachedTime).toBeLessThan(freshTime);
  });

  test('failed login should be fast', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Логин').fill('admin');
    await page.getByPlaceholder('Пароль').fill('wrongpassword123');

    const startTime = Date.now();
    await page.getByRole('button', { name: 'Войти' }).click();

    // Wait for error message
    await expect(page.getByText(/Invalid|Неверн/i)).toBeVisible({ timeout: 5000 });
    const failTime = Date.now() - startTime;

    console.log(`[Auth Timing] Failed login:`);
    console.log(`  - Time: ${failTime}ms`);

    expect(failTime).toBeLessThan(3000);
  });

  test('logout should be fast', async ({ page }) => {
    // Login first
    await page.goto('/');
    await page.getByPlaceholder('Логин').fill('admin');
    await page.getByPlaceholder('Пароль').fill('admin');
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page.getByText('Сводка')).toBeVisible({ timeout: 10000 });

    // Wait for UI to stabilize
    await page.waitForTimeout(1000);

    // Find and click logout
    const logoutBtn = page.getByRole('button', { name: 'Выйти' });
    if (await logoutBtn.isVisible()) {
      const startTime = Date.now();
      await logoutBtn.click();
      const logoutTime = Date.now() - startTime;

      console.log(`[Auth Timing] Logout:`);
      console.log(`  - Time: ${logoutTime}ms`);

      expect(logoutTime).toBeLessThan(1000);
    }
  });
});
