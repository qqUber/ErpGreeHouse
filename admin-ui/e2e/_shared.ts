import { Page, TestInfo, test as base } from '@playwright/test'

export const test = base
export { expect } from '@playwright/test'

export async function maybePause(page: Page, label: string) {
  const pause = process.env.E2E_PAUSE === '1' || process.env.E2E_PAUSE === 'true'
  if (!pause) return
  await page.pause()
  await page.getByText(label).count().catch(() => {})
}

export function attachConsole(page: Page, testInfo: TestInfo) {
  const lines: string[] = []
  page.on('console', msg => {
    try {
      lines.push(`[${msg.type()}] ${msg.text()}`)
    } catch {
    }
  })
  page.on('pageerror', err => {
    lines.push(`[pageerror] ${String(err)}`)
  })

  return async () => {
    if (!lines.length) return
    await testInfo.attach('console.log', { body: lines.join('\n'), contentType: 'text/plain' })
  }
}

export async function retryBackoff(testInfo: TestInfo) {
  if (!testInfo.retry) return
  const baseMs = Number(process.env.E2E_RETRY_BASE_MS || 750)
  const delay = Math.min(30_000, baseMs * Math.pow(2, testInfo.retry - 1))
  await new Promise(resolve => setTimeout(resolve, delay))
}
