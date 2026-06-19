import { test, expect } from '@playwright/test'

// Coding plugin + status-board home against the live stack. Wakapi may have little/no activity (valid
// 200) or no API key configured (graceful 502 → degraded tile), so accept either real totals or the
// "unavailable" state. Also asserts the status-board hero renders and the browser stays app-only.
const APP = process.env.PCC_APP_URL ?? 'http://app.pcc.localhost'
const USER = process.env.PCC_TEST_USER ?? 'testuser'
const PASS = process.env.PCC_TEST_PASS ?? 'Test123!'

test('coding: status board renders the hero + coding tile, and the /coding page, app-only', async ({
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

  // The status-board hero strip and its aggregate health readout render on the dashboard.
  await expect(
    page.getByRole('region', { name: 'Status summary' }),
  ).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/\d+\s*\/\s*\d+/).first()).toBeVisible()

  // The coding tile is present on the board (with its health dot) and degrades gracefully.
  const tile = page.getByTestId('tile-coding')
  await expect(tile).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('health-coding')).toBeVisible()

  // The /coding page is server-rendered with the weekly breakdown, or degrades.
  await page.goto(`${APP}/coding`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Coding', level: 1 })).toBeVisible()
  await expect(
    page.getByText(/This week/).or(page.getByText(/unavailable/i)),
  ).toBeVisible({ timeout: 20_000 })

  // The persistent sidebar nav is present on the plugin page (not only the dashboard).
  await expect(page.getByRole('navigation', { name: 'Plugins' })).toBeVisible()
  await expect(
    page.getByRole('navigation', { name: 'Plugins' }).getByRole('link', { name: 'Coding' }),
  ).toBeVisible()

  expect(foreign, `browser hit non-app hosts: ${foreign.join(', ')}`).toEqual([])
})
