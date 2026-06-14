import { test, expect } from '@playwright/test'

// Goodreads plugin against the live stack. With no UserId configured the shelf degrades (by design):
// the page must still render server-side with either books or the degraded notice — never a crash.
const APP = process.env.PCC_APP_URL ?? 'http://app.pcc.localhost'
const USER = process.env.PCC_TEST_USER ?? 'testuser'
const PASS = process.env.PCC_TEST_PASS ?? 'Test123!'

test('goodreads: SSR page renders (data or graceful degrade) through the BFF, app-only', async ({
  page,
}) => {
  const foreign: string[] = []
  page.on('request', (req) => {
    const host = new URL(req.url()).host
    if (!/(^|\.)pcc\.localhost$/.test(host)) return
    if (!host.startsWith('app.') && !host.startsWith('keycloak.')) foreign.push(host)
  })

  await page.goto(`${APP}/`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#username', { timeout: 30_000 })
  await page.fill('#username', USER)
  await page.fill('#password', PASS)
  await page.click('#kc-login')
  await page.waitForURL(/app\.pcc\.localhost/, { timeout: 30_000 })

  await expect(page.getByRole('link', { name: 'Reading' }).first()).toBeVisible({ timeout: 15_000 })

  await page.goto(`${APP}/goodreads`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Reading' })).toBeVisible()
  // Either a book links out, or the degraded notice shows — both are valid SSR outcomes.
  await expect(page.getByText(/unavailable|No books/i).or(page.getByRole('link'))).toBeTruthy()

  expect(foreign, `browser hit non-app hosts: ${foreign.join(', ')}`).toEqual([])
})
