import { attachConsole, expect, maybePause, retryBackoff, test } from '../_shared'

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

function runId() {
  return String(process.env.E2E_RUN_ID || Date.now())
}

async function apiLogin(request: any, username: string, password: string) {
  const res = await request.post('/api/v1/public/auth/login', { data: { username, password } })
  expect(res.ok()).toBeTruthy()
  const j = await res.json()
  expect(j.token).toBeTruthy()
  return String(j.token)
}

async function apiPostTestCleanup(request: any, token: string, payload: any) {
  const res = await request.post('/api/v1/test/cleanup', { headers: { 'x-admin-secret': token }, data: payload })
  expect(res.ok()).toBeTruthy()
}

test('create product card (manager) and verify in DB', async ({ page, request }) => {
  const rid = runId()
  const code = `E2E_${rid}_COFFEE`
  const name = `E2E Coffee ${rid}`

  await page.goto('/')
  await page.getByPlaceholder('Логин').fill('manager')
  await page.getByPlaceholder('Пароль').fill('manager')
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page.getByText(/Роль:\s*Менеджер/)).toBeVisible()
  await maybePause(page, 'После входа')

  await page.getByText('Товары').click()
  await expect(page.getByText('Товары / услуги')).toBeVisible()

  await page.getByPlaceholder('Код (например E2E_COFFEE)').fill(code)
  await page.getByPlaceholder('Название').fill(name)
  await page.getByPlaceholder('Тип').fill('goods')
  await page.getByPlaceholder('Цена').fill('250')
  await page.getByRole('button', { name: 'Создать' }).click()

  await expect(page.getByText(code)).toBeVisible()
  await expect(page.getByText(name)).toBeVisible()
  await maybePause(page, 'После создания товара')

  const ownerToken = await apiLogin(request, 'admin', 'admin')
  const dbRes = await request.get(`/api/v1/test/product_by_code?code=${encodeURIComponent(code)}`, { headers: { 'x-admin-secret': ownerToken } })
  expect(dbRes.ok()).toBeTruthy()
  const db = await dbRes.json()
  expect(db.product).toBeTruthy()
  expect(db.product.code).toBe(code)
  expect(Number(db.product.price)).toBe(250)

  await apiPostTestCleanup(request, ownerToken, { product_codes: [code] })
})

test('operator registers client and makes sale from catalog (verify UI + DB)', async ({ page, request }) => {
  const rid = runId()
  const code = `E2E_${rid}_SERVICE`
  const phone = `+7999${String(rid).slice(-7)}`

  const ownerToken = await apiLogin(request, 'admin', 'admin')
  const createRes = await request.post('/api/v1/products', {
    headers: { 'x-admin-secret': ownerToken },
    data: { code, name: `E2E Service ${rid}`, kind: 'service', price: 300, active: true }
  })
  expect(createRes.ok()).toBeTruthy()

  await page.goto('/')
  await page.getByPlaceholder('Логин').fill('operator')
  await page.getByPlaceholder('Пароль').fill('operator')
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page.getByText(/Роль:\s*Оператор/)).toBeVisible()
  await maybePause(page, 'После входа оператора')

  await page.getByText('Операции').click()
  await page.getByPlaceholder('+79991234567').fill(phone)
  await page.getByRole('button', { name: 'Идентифицировать' }).click()
  await expect(page.getByText(/Клиент:\s*\d+/)).toBeVisible()

  await page.getByText('Каталог').scrollIntoViewIfNeeded()
  const select = page.getByRole('combobox')
  const optValue = await select.evaluate((el, c) => {
    const s = el as HTMLSelectElement
    const opt = Array.from(s.options).find(o => (o.textContent || '').includes(String(c)))
    return opt ? opt.value : ''
  }, code)
  expect(optValue).toBeTruthy()
  await select.selectOption(optValue)
  await page.getByRole('button', { name: 'Добавить в чек' }).click()
  
  // Wait for item to appear in cart table using data-testid
  await expect(page.getByTestId(`cart-item-${code}`)).toBeVisible({ timeout: 5000 })
  await expect(page.getByTestId(`cart-item-code-${code}`)).toBeVisible()

  await page.getByRole('button', { name: 'Провести' }).click()
  await expect(page.getByText(/Операция выполнена\./)).toBeVisible()
  await maybePause(page, 'После продажи')

  await page.getByText('Клиенты').click()
  await page.getByPlaceholder('Поиск по телефону или ФИО').fill(phone)
  await page.getByRole('button', { name: 'Поиск' }).click()
  await page.getByRole('cell', { name: phone }).click()
  await expect(page.getByText('История операций')).toBeVisible()

  const custRes = await request.get(`/api/v1/test/customer_by_phone?phone=${encodeURIComponent(phone)}`, { headers: { 'x-admin-secret': ownerToken } })
  expect(custRes.ok()).toBeTruthy()
  const custDb = await custRes.json()
  expect(custDb.customer).toBeTruthy()
  const customerId = Number(custDb.customer.id)
  expect(customerId).toBeGreaterThan(0)

  const txRes = await request.get(`/api/v1/test/transactions_by_customer?customer_id=${customerId}`, { headers: { 'x-admin-secret': ownerToken } })
  expect(txRes.ok()).toBeTruthy()
  const txDb = await txRes.json()
  expect(Array.isArray(txDb.items)).toBeTruthy()
  expect(txDb.items.length).toBeGreaterThan(0)
  const itemsJson = String(txDb.items[0].items_json || '[]')
  const parsed = JSON.parse(itemsJson)
  expect(parsed.some((it: any) => String(it.code) === code)).toBeTruthy()

  await apiPostTestCleanup(request, ownerToken, { phones: [phone], product_codes: [code] })
})
