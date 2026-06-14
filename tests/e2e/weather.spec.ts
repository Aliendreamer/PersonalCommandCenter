import { test, expect } from '@playwright/test'

// Weather plugin against the live stack (Open-Meteo, no key). Browser only talks to app./keycloak.
const APP = process.env.PCC_APP_URL ?? 'http://app.pcc.localhost'
const USER = process.env.PCC_TEST_USER ?? 'testuser'
const PASS = process.env.PCC_TEST_PASS ?? 'Test123!'

test('weather: SSR page renders the forecast through the BFF, app-only', async ({ page }) => {
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

  await expect(page.getByRole('link', { name: 'Weather' }).first()).toBeVisible({ timeout: 15_000 })

  await page.goto(`${APP}/weather`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Weather' })).toBeVisible()
  // Open-Meteo is keyless and reliable: the page renders real data (a °C reading), not the degraded state.
  await expect(page.getByText(/°C|°/).first()).toBeVisible({ timeout: 20_000 })

  expect(foreign, `browser hit non-app hosts: ${foreign.join(', ')}`).toEqual([])
})
