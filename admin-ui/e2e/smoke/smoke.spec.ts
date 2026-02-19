import { attachConsole, expect, retryBackoff, test } from '../_shared'

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
  await page.goto('/')
  await page.getByPlaceholder('Логин').fill('admin')
  await page.getByPlaceholder('Пароль').fill('wrong')
  await page.getByRole('button', { name: 'Войти' }).click()

  await expect(page.getByRole('status')).toContainText(/(Доступ|401|credentials)/i)
})

test('pos sale creates transaction visible in customer card', async ({ page }) => {
  const phone = `+7999${String(Date.now()).slice(-7)}`

  await page.goto('/')
  await page.getByPlaceholder('Логин').fill('admin')
  await page.getByPlaceholder('Пароль').fill('admin')
  await page.getByRole('button', { name: 'Войти' }).click()

  await page.getByText('Операции').click()
  await page.getByPlaceholder('+79991234567').fill(phone)
  await page.getByRole('button', { name: 'Идентифицировать' }).click()
  await expect(page.getByText(/Клиент:\s*\d+/)).toBeVisible()

  await page.getByRole('button', { name: 'Провести' }).click()
  await expect(page.getByText(/Операция выполнена\./)).toBeVisible()

  await page.getByText('Клиенты').click()
  await page.getByPlaceholder('Поиск по телефону или ФИО').fill(phone)
  await page.getByRole('button', { name: 'Поиск' }).click()

  await page.getByRole('cell', { name: phone }).click()
  await expect(page.getByText('История операций')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Чек (PDF)' }).first()).toBeVisible()
})
