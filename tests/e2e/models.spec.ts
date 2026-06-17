import { test, expect } from '@playwright/test'

// Models plugin against the live stack (Ollama inventory + GPU telemetry). Ollama may have no models
// pulled (valid empty 200) and the GPU exporter may not report under WSL2 — so accept either data or
// the graceful "no models / no GPU" states. Browser only talks to app./keycloak.
const APP = process.env.PCC_APP_URL ?? 'http://app.pcc.localhost'
const USER = process.env.PCC_TEST_USER ?? 'testuser'
const PASS = process.env.PCC_TEST_PASS ?? 'Test123!'

test('models: SSR page renders the Ollama + GPU board through the BFF, app-only', async ({
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

  await expect(page.getByRole('link', { name: 'Models' }).first()).toBeVisible({ timeout: 15_000 })

  await page.goto(`${APP}/models`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Models', level: 1 })).toBeVisible()
  // Ollama is reachable → the board renders server-side (Installed section), or it degrades gracefully.
  await expect(
    page.getByText(/Installed \(/).or(page.getByText(/unavailable/i)),
  ).toBeVisible({ timeout: 20_000 })

  expect(foreign, `browser hit non-app hosts: ${foreign.join(', ')}`).toEqual([])
})
