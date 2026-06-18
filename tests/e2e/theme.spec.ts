import { test, expect } from '@playwright/test'

// Theme toggle against the live stack (Mantine color scheme). Dark is the default with no cookie;
// a Light choice must persist across reload (cookie + pre-paint script). Browser only talks to
// app./keycloak. The toggle's onClick attaches on hydration, but the buttons are server-rendered
// (Dark pre-pressed by the dark default), so we retry each click idempotently until it lands.
const APP = process.env.PCC_APP_URL ?? 'http://app.pcc.localhost'
const USER = process.env.PCC_TEST_USER ?? 'testuser'
const PASS = process.env.PCC_TEST_PASS ?? 'Test123!'

test('theme: light persists across reload over the dark default, app-only', async ({
  page,
}) => {
  const foreign: string[] = []
  page.on('request', (req) => {
    const host = new URL(req.url()).host
    if (!/(^|\.)pcc\.localhost$/.test(host)) return
    if (!host.startsWith('app.') && !host.startsWith('keycloak.'))
      foreign.push(host)
  })

  await page.goto(`${APP}/`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#username', { timeout: 30_000 })
  await page.fill('#username', USER)
  await page.fill('#password', PASS)
  await page.click('#kc-login')
  await page.waitForURL(/app\.pcc\.localhost/, { timeout: 30_000 })

  const html = page.locator('html')

  // No cookie yet → dark is the default.
  await expect(html).toHaveClass(/dark/)

  // Choose Light. Retry the click until it lands (handler attaches on hydration); clicking Light
  // is idempotent so retrying is safe.
  await expect(async () => {
    await page.getByRole('button', { name: 'Light' }).click()
    await expect(html).not.toHaveClass(/dark/, { timeout: 1_000 })
  }).toPass({ timeout: 15_000 })

  // Reload → still light (cookie persisted, applied before paint by the head script) — proving the
  // choice survives over the dark default.
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(html).not.toHaveClass(/dark/)
  await expect(page.getByRole('button', { name: 'Light' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  // Choose Dark again → dark class restored (idempotent retry past hydration).
  await expect(async () => {
    await page.getByRole('button', { name: 'Dark' }).click()
    await expect(html).toHaveClass(/dark/, { timeout: 1_000 })
  }).toPass({ timeout: 15_000 })

  expect(foreign, `browser hit non-app hosts: ${foreign.join(', ')}`).toEqual([])
})
