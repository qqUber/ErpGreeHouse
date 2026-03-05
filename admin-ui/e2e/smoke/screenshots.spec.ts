import { expect, login, test } from '../_shared';

test('capture screenshots with production data', async ({ page }) => {
  // Login as admin
  await login(page, 'admin');

  // Wait for navigation to be ready
  await expect(page.getByText('Панель управления')).toBeVisible({ timeout: 15000 });

  // Helper to capture page
  async function capturePage(tabText: string, fileName: string) {
    console.log(`Capturing ${tabText}...`);

    // Click tab (specifically target the tab element with exact text match)
    await page.locator('.tab').filter({ hasText: new RegExp(`^${tabText}$`) }).click();
    await page.waitForTimeout(3000);

    // Click refresh if present
    const refreshBtn = page.getByText('Обновить', { exact: true });
    if (await refreshBtn.count() > 0) {
      await refreshBtn.first().click();
      await page.waitForTimeout(3000);
    }

    // For customers, trigger search to load data
    if (tabText === 'Клиенты') {
      const searchBtn = page.getByText('Поиск', { exact: true });
      if (await searchBtn.count() > 0) {
        await searchBtn.click();
        await page.waitForTimeout(3000);
      }
    }

    // Take screenshot
    await page.screenshot({ fullPage: true, path: `screenshots/${fileName}` });
    console.log(`✓ Screenshot: ${fileName}`);
  }

  // Capture all pages
  await capturePage('Главная', 'E2E-01-dashboard.png');
  await capturePage('Клиенты', 'E2E-02-customers.png');
  await capturePage('Товары', 'E2E-03-products.png');
  await capturePage('Продажи', 'E2E-04-sales.png');
  await capturePage('Маркетинг', 'E2E-05-marketing.png');
  await capturePage('Интеграции', 'E2E-06-integrations.png');
  await capturePage('Настройки', 'E2E-07-settings.png');
  await capturePage('Комплаенс', 'E2E-08-compliance.png');

  console.log('✅ All screenshots captured!');
});
