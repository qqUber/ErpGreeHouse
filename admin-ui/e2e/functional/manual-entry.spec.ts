import { expect, test } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

test('manual client creation', async ({ page }) => {
  const phone = '7999' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0')
  const name = 'Manual Client ' + Date.now()

  await page.goto('/')
  await page.getByPlaceholder('Логин').fill('admin')
  await page.getByPlaceholder('Пароль').fill('admin')
  await page.getByRole('button', { name: 'Войти' }).click()
  
  // Wait for dashboard to load
  await expect(page.getByText('Сводка')).toBeVisible()
  
  // Check role - wait for it to load
  // await expect(page.getByText(/Роль:/)).toBeVisible({ timeout: 10000 })
  // await expect(page.getByText(/Админ/i)).toBeVisible()

  await page.getByText('Клиенты').click()
  await page.getByRole('button', { name: 'Новый клиент' }).click()
  
  await page.getByPlaceholder('ФИО (обязательно)').fill(name)
  await page.getByPlaceholder('Телефон (7999...)').fill(phone)
  await page.getByPlaceholder('Заметки').fill('Test notes')
  await page.getByRole('button', { name: 'Создать' }).click()

  // Verify in list
  await page.getByPlaceholder('Поиск по телефону или ФИО').fill(phone)
  await page.getByRole('button', { name: 'Поиск' }).click()
  // Wait for search results
  await expect(page.getByRole('cell', { name: phone })).toBeVisible()
  await expect(page.getByRole('cell', { name: name })).toBeVisible()
})

test.only('product import from csv', async ({ page }) => {
  page.on('console', msg => console.log(`BROWSER: ${msg.text()}`))
  const csvContent = `code;name;price;kind
IMP_001;Imported Product 1;150;goods
IMP_002;Imported Product 2;250;service`
  const csvPath = path.resolve('test_products.csv')
  fs.writeFileSync(csvPath, csvContent)

  try {
    await page.goto('/')
    await page.getByPlaceholder('Логин').fill('admin')
    await page.getByPlaceholder('Пароль').fill('admin')
    await page.getByRole('button', { name: 'Войти' }).click()

    // Wait for login to complete
    await expect(page.getByText('Сводка')).toBeVisible()
    await page.waitForTimeout(1000)

    // Verify Customers tab first
    await page.getByText('Клиенты').click()
    await expect(page.getByRole('button', { name: 'Новый клиент' })).toBeVisible()

    // Now switch to Products
    await page.getByText('Товары').click()
    await page.waitForTimeout(1000)

    await expect(page.getByText('Товары / услуги')).toBeVisible()
    
    // The input is hidden, so we need to interact with it carefully or use setInputFiles on the locator
    // We created: <input type="file" ref={fileInputRef} style={{ display: 'none' }} ... />
    // Playwright can handle hidden file inputs if we locate them
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(csvPath)
    
    // Wait for success message
    await expect(page.getByText(/Обработано: 2/)).toBeVisible()
    
    await expect(page.getByText('IMP_001')).toBeVisible()
    await expect(page.getByText('Imported Product 1')).toBeVisible()
    await expect(page.getByText('IMP_002')).toBeVisible()
    await expect(page.getByText('Imported Product 2')).toBeVisible()
  } finally {
    if (fs.existsSync(csvPath)) fs.unlinkSync(csvPath)
  }
})
