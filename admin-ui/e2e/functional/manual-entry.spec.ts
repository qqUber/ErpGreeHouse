import { expect, test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function ensureEnvReady() {
  const health = await fetch('http://localhost:8000/health');
  expect(health.ok).toBeTruthy();
  const status = await fetch('http://localhost:5173/api/v1/public/status');
  expect(status.ok).toBeTruthy();
}

test('manual client creation', async ({ page }) => {
  test.setTimeout(120000);
  const phone =
    '7999' +
    Math.floor(Math.random() * 10000000)
      .toString()
      .padStart(7, '0');
  const name = 'Manual Client ' + Date.now();

  await ensureEnvReady();
  await page.goto('/');
  await page.getByPlaceholder('Логин').fill('admin');
  await page.getByPlaceholder('Пароль').fill('admin');
  await page.getByRole('button', { name: 'Войти' }).click();

  // Wait for dashboard to load
  await expect(page.getByText('Сводка')).toBeVisible();
  // Wait until auth overlay finishes
  await page.waitForSelector('.overlay', { state: 'hidden', timeout: 60000 });

  // Check role - wait for it to load
  // await expect(page.getByText(/Роль:/)).toBeVisible({ timeout: 10000 })
  // await expect(page.getByText(/Админ/i)).toBeVisible()

  await page.getByText('Клиенты').click();
  await page.getByRole('button', { name: 'Новый клиент' }).click();

  // Wait for form dialog to appear
  await expect(page.getByText('Создание клиента')).toBeVisible({ timeout: 10000 });

  // Use actual placeholder text from the UI
  await page.getByPlaceholder('Иванов Иван Иванович').fill(name);
  await page.getByPlaceholder('+79991234567').fill(phone);
  await page.getByPlaceholder('Комментарий к клиенту').fill('Test notes');
  await page.getByRole('button', { name: 'Создать' }).click();

  // Verify in list
  await page.getByPlaceholder('Поиск по телефону или ФИО').fill(phone);
  await page.getByRole('button', { name: 'Поиск' }).click();
  // Wait for search results
  await expect(page.getByRole('cell', { name: phone })).toBeVisible();
  await expect(page.getByRole('cell', { name: name })).toBeVisible();
});

test('product import from csv', async ({ page }) => {
  test.setTimeout(120000);
  page.on('console', (msg) => console.log(`BROWSER: ${msg.text()}`));
  const csvContent = `code;name;price;kind
IMP_001;Imported Product 1;150;goods
IMP_002;Imported Product 2;250;service`;
  const csvPath = path.resolve('test_products.csv');
  fs.writeFileSync(csvPath, csvContent);

  try {
    await ensureEnvReady();
    await page.goto('/');
    await page.getByPlaceholder('Логин').fill('admin');
    await page.getByPlaceholder('Пароль').fill('admin');
    await page.getByRole('button', { name: 'Войти' }).click();

    // Wait for login to complete
    await expect(page.getByText('Сводка')).toBeVisible();
    await page.waitForSelector('.overlay', { state: 'hidden', timeout: 60000 });
    await page.waitForTimeout(1000);

    // Navigate to Products tab
    await page.getByText('Товары').click();
    await page.waitForTimeout(1000);

    await expect(page.getByText('Товары / услуги')).toBeVisible();

    // Find file input and upload CSV
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    // Wait for success message
    await expect(page.getByText(/Обработано:|Processed:|2/i)).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);

    // Verify products are visible
    await expect(page.getByText('IMP_001')).toBeVisible();
    await expect(page.getByText('IMP_002')).toBeVisible();
  } finally {
    if (fs.existsSync(csvPath)) fs.unlinkSync(csvPath);
  }
});
