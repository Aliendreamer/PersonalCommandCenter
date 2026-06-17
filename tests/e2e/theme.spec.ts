import { test, expect } from '@playwright/test'

// Theme toggle against the live stack: dark persists across reload (cookie + pre-paint script),
// browser only talks to app./keycloak.
const APP = process.env.PCC_APP_URL ?? 'http://app.pcc.localhost'
const USER = process.env.PCC_TEST_USER ?? 'testuser'
const PASS = process.env.PCC_TEST_PASS ?? 'Test123!'

test('theme: toggle dark persists across reload, app-only', async ({ page }) => {
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

  const html = page.locator('html')

  // Select Dark from the header toggle → html gains the dark class immediately.
  await page.getByRole('button', { name: 'Dark' }).click()
  await expect(html).toHaveClass(/dark/)

  // Reload → still dark (cookie persisted, applied before paint by the head script).
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(html).toHaveClass(/dark/)

  // Wait for the toggle to hydrate (active state reflects the persisted cookie) before clicking.
  await expect(page.getByRole('button', { name: 'Dark' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  // Select Light → dark class removed.
  await page.getByRole('button', { name: 'Light' }).click()
  await expect(html).not.toHaveClass(/dark/)

  expect(foreign, `browser hit non-app hosts: ${foreign.join(', ')}`).toEqual([])
})
