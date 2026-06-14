import { test, expect } from '@playwright/test'

// Uptime plugin against the live stack (targets: core-api /health + keycloak). Browser only talks
// to app./keycloak. core-api /health is a known-up target, so at least one "up" badge renders.
const APP = process.env.PCC_APP_URL ?? 'http://app.pcc.localhost'
const USER = process.env.PCC_TEST_USER ?? 'testuser'
const PASS = process.env.PCC_TEST_PASS ?? 'Test123!'

test('uptime: SSR status board renders per-target health through the BFF, app-only', async ({
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

  await expect(page.getByRole('link', { name: 'Uptime' }).first()).toBeVisible({ timeout: 15_000 })

  await page.goto(`${APP}/uptime`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Uptime' })).toBeVisible()
  // core-api /health is up, so the board shows the target name and an "up · 200" badge.
  await expect(page.getByText('core-api', { exact: true })).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText(/^up( ·|$)/).first()).toBeVisible({ timeout: 20_000 })

  expect(foreign, `browser hit non-app hosts: ${foreign.join(', ')}`).toEqual([])
})
