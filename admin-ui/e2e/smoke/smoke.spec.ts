import { attachConsole, expect, login, retryBackoff, test, TEST_CREDENTIALS } from '../_shared'

const consoleFlush = new Map<string, () => Promise<void>>()

test.beforeEach(async ({ page }, testInfo) => {
  consoleFlush.set(testInfo.testId, attachConsole(page, testInfo))
  await retryBackoff(testInfo)
})

test.afterEach(async ({}, testInfo) => {
  const flush = consoleFlush.get(testInfo.testId)
  if (flush) await flush()
  consoleFlush.delete(testInfo.testId)
})

test('auth rejects invalid password', async ({ page }) => {
  page.on('console', msg => console.log(`[Browser] ${msg.type()}: ${msg.text()}`))
  page.on('pageerror', err => console.log(`[Browser] Page Error: ${err.message}`))
  
  // Try to login with invalid password via API
  const loginResponse = await page.request.post('/api/v1/public/auth/login', {
    data: {
      username: 'admin',
      password: 'wrongpassword'
    }
  })
  
  // Should get 401 for invalid credentials
  expect(loginResponse.status()).toBe(401)
  
  const errorData = await loginResponse.json()
  // Backend returns localized error message in Russian
  expect(errorData.detail).toContain('Доступ запрещён')
  
  console.log('[Test] Correctly rejected invalid password with 401')
})

test('pos sale creates transaction visible in customer card', async ({ page }) => {
  const phone = `+7999${String(Date.now()).slice(-7)}`

  // Use login helper instead of manual login
  await login(page, 'admin')
  
  // Wait for tabs to appear after login
  await expect(page.getByText('Продажи', { exact: true })).toBeVisible({ timeout: 10000 })
  
  // Click on Продажи tab to navigate to POS view
  await page.getByText('Продажи', { exact: true }).click()
  await page.waitForTimeout(1000)

  // Fill phone and identify customer
  await page.getByPlaceholder('+79991234567').fill(phone)
  await page.getByRole('button', { name: 'Идентифицировать' }).click()

  // Wait for customer identification and verify it worked
  await page.waitForTimeout(3000)
  
  // Check if customer was found - look for the pill element with customer ID
  const customerPill = page.locator('.pill').filter({ hasText: 'Клиент:' })
  
  // Wait for the pill to contain a number (customer ID)
  await expect(customerPill).toContainText(/\d+/, { timeout: 5000 })
  console.log('[Test] Customer identified successfully')

  // Select product from catalog - use default seeded products
  const select = page.locator('select.input')
  // Wait for options to load and select first available product
  await expect(select).toBeVisible()
  const options = select.locator('option')
  const optionCount = await options.count()
  console.log(`[Test] Found ${optionCount} options in product dropdown`)
  
  if (optionCount > 1) {
    // Select the second option (first is "Choose product...")
    await select.selectOption({ index: 1 })
    console.log('[Test] Selected product from dropdown')
  }
  
  await page.getByRole('button', { name: 'Добавить в чек' }).click()
  
  // Verify product in cart
  await expect(page.getByTestId('cart-table')).toBeVisible({ timeout: 5000 })
  
  // Verify total is shown
  await expect(page.getByText(/Сумма.*₽/i)).toBeVisible()

  // Process sale - click the button
  // Note: The sale API works but the UI has a navigation issue after sale
  // We verify the sale worked by checking customer history later
  await page.getByRole('button', { name: 'Провести' }).click()
  
  // Wait for any navigation/transition
  await page.waitForTimeout(2000)

  // Navigate to customers - the app might have navigated elsewhere
  await page.getByText('Клиенты').click()
  await page.waitForTimeout(1000)

  await page.getByPlaceholder('Поиск по телефону или ФИО').fill(phone)
  await page.getByRole('button', { name: 'Поиск' }).click()

  await page.waitForTimeout(2000)
  
  // Click on the customer to view their details
  await page.getByRole('cell', { name: phone }).click()
  
  // Verify the transaction history is visible
  await expect(page.getByText('История операций')).toBeVisible()
  
  // Verify there's a receipt link (transaction was created)
  await expect(page.getByRole('link', { name: 'Чек (PDF)' }).first()).toBeVisible()
  
  console.log('[Test] POS sale completed and transaction visible in customer card')
})
