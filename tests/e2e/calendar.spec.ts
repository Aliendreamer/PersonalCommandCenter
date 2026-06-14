import { test, expect } from '@playwright/test'

// Calendar plugin against the live stack (SSR-BFF + Radicale). Browser only ever talks to app./
// keycloak. Prereqs: `docker compose up -d` with radicale + the realm imported. See README.md.

const APP = process.env.PCC_APP_URL ?? 'http://app.pcc.localhost'
const USER = process.env.PCC_TEST_USER ?? 'testuser'
const PASS = process.env.PCC_TEST_PASS ?? 'Test123!'

function localInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

test('calendar: SSR page + create-through-the-BFF round-trip, app-only', async ({ page }) => {
  // The browser must only ever reach app. / keycloak. — never the internal API.
  const foreign: string[] = []
  page.on('request', (req) => {
    const host = new URL(req.url()).host
    if (!/(^|\.)pcc\.localhost$/.test(host)) {
      return
    }
    if (!host.startsWith('app.') && !host.startsWith('keycloak.')) {
      foreign.push(host)
    }
  })

  // Log in.
  await page.goto(`${APP}/`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#username', { timeout: 30_000 })
  await page.fill('#username', USER)
  await page.fill('#password', PASS)
  await page.click('#kc-login')
  await page.waitForURL(/app\.pcc\.localhost/, { timeout: 30_000 })

  // The plugin contributes a "Calendar" nav entry.
  await expect(page.getByRole('link', { name: 'Calendar' }).first()).toBeVisible({
    timeout: 15_000,
  })

  // The /calendar page is server-rendered (its heading is in the raw SSR HTML).
  await page.goto(`${APP}/calendar`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible()
  await page.waitForLoadState('networkidle') // let the client hydrate before interacting

  // Create a unique event starting a couple minutes from now (so it's in the window and "today").
  const title = `E2E ${Date.now()}`
  const start = new Date(Date.now() + 2 * 60_000)
  const end = new Date(Date.now() + 62 * 60_000)

  // Open the create form (retry the click to absorb any remaining hydration timing).
  await expect(async () => {
    await page.getByRole('button', { name: 'New event' }).click()
    await expect(page.getByLabel('Title')).toBeVisible({ timeout: 2000 })
  }).toPass({ timeout: 20_000 })
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Start').fill(localInput(start))
  await page.getByLabel('End').fill(localInput(end))
  await page.getByRole('button', { name: 'Create' }).click()

  // The new event shows up in the list (the mutation went through the SSR server + loader refresh).
  await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 })

  // The dashboard's calendar-today tile shows it too.
  await page.goto(`${APP}/`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 })

  // Clean up so reruns stay deterministic.
  await page.goto(`${APP}/calendar`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')
  await expect(async () => {
    await page
      .locator('li', { hasText: title })
      .getByRole('button', { name: 'Delete' })
      .click()
    await expect(page.getByText(title)).toHaveCount(0, { timeout: 2000 })
  }).toPass({ timeout: 20_000 })

  expect(foreign, `browser hit non-app hosts: ${foreign.join(', ')}`).toEqual([])
})
