import { expect, test } from '@playwright/test';

test.describe('Role Configuration', () => {
  test('Owner can configure operator permissions', async ({ page }) => {
    // 1. Login as owner (using data-testid as per E2E_TEST_FIX_PLAN)
    await page.goto('/');
    await page.getByTestId('common_input_username_en').fill('admin');
    await page.getByTestId('common_input_password_en').fill('admin');
    await page.getByTestId('common_btn_password_login_en').click();
    
    // Wait for login to complete by checking for username in the header
    await expect(page.locator('.font-medium.text-gray-900:has-text("admin")')).toBeVisible({
      timeout: 15000,
    });

    // 2. Go to Settings using data-testid
    await page.getByTestId('admin_nav_settings_en').click();
    await expect(page.locator('text=Управление доступом (Роли)')).toBeVisible();

    // 3. Find "product.read" row and "Оператор" column
    // The table headers are in <thead>
    const headers = page.locator('table thead th');
    const count = await headers.count();
    let operatorColIndex = -1;
    for (let i = 0; i < count; i++) {
 await headers.nth      const text =(i).innerText();
      if (text === 'Оператор') {
        operatorColIndex = i;
        break;
      }
    }
    expect(operatorColIndex).toBeGreaterThan(-1);

    // Find the row with "product.read"
    const row = page.locator('tr:has-text("product.read")');
    // The checkbox is in the cell corresponding to operatorColIndex
    const checkbox = row.locator('td').nth(operatorColIndex).locator('input[type="checkbox"]');

    // Ensure it is checked initially (default)
    await expect(checkbox).toBeChecked();

    // 4. Uncheck it
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
    await page.waitForTimeout(500);
    await page.click('button:has-text("Обновить")');
    await expect(checkbox).not.toBeChecked();

    // 5. Logout
    await page.getByTestId('admin_btn_logout_en').click();
    await expect(page.locator('text=Вход')).toBeVisible();

    // 6. Login as operator (using data-testid)
    await page.getByTestId('common_input_username_en').fill('operator');
    await page.getByTestId('common_input_password_en').fill('operator');
    await page.getByTestId('common_btn_password_login_en').click();

    // 7. Verify "Товары" tab is NOT visible
    await expect(page.locator('.tab:has-text("Товары")')).not.toBeVisible();

    // 8. Logout
    await page.getByTestId('admin_btn_logout_en').click();

    // 9. Login as owner to restore (using data-testid)
    await page.getByTestId('common_input_username_en').fill('admin');
    await page.getByTestId('common_input_password_en').fill('admin');
    await page.getByTestId('common_btn_password_login_en').click();

    await page.getByTestId('admin_nav_settings_en').click();

    // Re-locate elements as page reloaded
    const headers2 = page.locator('table thead th');
    const row2 = page.locator('tr:has-text("product.read")');
    const checkbox2 = row2.locator('td').nth(operatorColIndex).locator('input[type="checkbox"]');

    await checkbox2.check();
    await expect(checkbox2).toBeChecked();

    // 10. Logout and verify operator access restored
    await page.getByTestId('admin_btn_logout_en').click();
    await page.getByTestId('common_input_username_en').fill('operator');
    await page.getByTestId('common_input_password_en').fill('operator');
    await page.getByTestId('common_btn_password_login_en').click();

    await expect(page.locator('.tab:has-text("Товары")')).toBeVisible();
  });
});
