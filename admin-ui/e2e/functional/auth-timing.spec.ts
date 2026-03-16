import { expect, test } from '@playwright/test';

test.describe('Authorization Timing', () => {
  async function loginByPassword(page: any, username: string, password: string) {
    await page.goto('/');
    await page.getByTestId('common_input_username_en').fill(username);
    await page.getByTestId('common_input_password_en').fill(password);
    await page.getByTestId('common_btn_login_en').click();
    await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible({ timeout: 10000 });
  }

  test('login by password - full flow', async ({ page }) => {
    const totalTime = Date.now();
    const navStart = Date.now();
    await page.goto('/');
    const navTime = Date.now() - navStart;

    await page.getByTestId('common_input_username_en').fill('admin');
    await page.getByTestId('common_input_password_en').fill('admin');

    const loginStart = Date.now();
    await page.getByTestId('common_btn_login_en').click();
    await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible({ timeout: 10000 });
    const loginTime = Date.now() - loginStart;

    const total = Date.now() - totalTime;
    console.log(`[Auth Timing] nav=${navTime}ms login=${loginTime}ms total=${total}ms`);
    expect(total).toBeLessThan(5000);
  });

  test('session restore from localStorage - instant auth', async ({ page }) => {
    await loginByPassword(page, 'admin', 'admin');
    await page.waitForTimeout(500);

    const reloadStart = Date.now();
    await page.reload();
    await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible({ timeout: 5000 });
    const restoreTime = Date.now() - reloadStart;

    console.log(`[Auth Timing] restore=${restoreTime}ms`);
    expect(restoreTime).toBeLessThan(1000);
  });

  test('session from cookie - no reload needed', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const isAuthed = await page.getByTestId('admin_nav_dashboard').isVisible({ timeout: 3000 });
    const loadTime = Date.now() - startTime;
    console.log(`[Auth Timing] cookie load=${loadTime}ms authed=${isAuthed}`);
    expect(loadTime).toBeLessThan(2000);
  });

  test('compare: fresh login vs cached session', async ({ page, browserName, browser }) => {
    const freshContext = await browser.newContext();
    const freshPage = await freshContext.newPage();
    const freshStart = Date.now();
    await loginByPassword(freshPage, 'admin', 'admin');
    const freshTime = Date.now() - freshStart;
    await freshContext.close();

    await loginByPassword(page, 'admin', 'admin');
    await page.waitForTimeout(500);
    const cachedStart = Date.now();
    await page.reload();
    await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible({ timeout: 5000 });
    const cachedTime = Date.now() - cachedStart;

    console.log(
      `[Auth Timing Comparison] ${browserName}: fresh=${freshTime}ms cached=${cachedTime}ms`
    );
    expect(cachedTime).toBeLessThan(2000);
  });

  test('failed login should be fast', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/admin/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await page.getByTestId('common_input_username_en').fill('admin');
    await page.getByTestId('common_input_password_en').fill('wrongpassword123');
    const startTime = Date.now();
    await page.getByTestId('common_btn_login_en').click();
    await expect(page.getByTestId('common_input_username_en')).toBeVisible({ timeout: 5000 });
    const failTime = Date.now() - startTime;
    console.log(`[Auth Timing] failed=${failTime}ms`);
    expect(failTime).toBeLessThan(3000);
  });

  test('logout should be fast', async ({ page }) => {
    await loginByPassword(page, 'admin', 'admin');
    await page.waitForTimeout(1000);
    const logoutBtn = page.getByTestId('admin_btn_logout_en');
    if (await logoutBtn.isVisible()) {
      const startTime = Date.now();
      await logoutBtn.click();
      const logoutTime = Date.now() - startTime;
      console.log(`[Auth Timing] logout=${logoutTime}ms`);
      expect(logoutTime).toBeLessThan(1000);
    }
  });
});
