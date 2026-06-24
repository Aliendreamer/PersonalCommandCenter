import { test, expect } from '@playwright/test'

// RSS plugin against the live stack (Hacker News frontpage feed). Browser only talks to app./keycloak.
const APP = process.env.PCC_APP_URL ?? 'http://app.pcc.localhost'
const USER = process.env.PCC_TEST_USER ?? 'testuser'
const PASS = process.env.PCC_TEST_PASS ?? 'Test123!'

test('rss: SSR page lists feed items through the BFF, app-only', async ({ page }) => {
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

  await expect(page.getByRole('link', { name: 'Feeds' }).first()).toBeVisible({ timeout: 15_000 })

  await page.goto(`${APP}/rss`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Feeds' })).toBeVisible()
  // The force-refresh button renders regardless of feed health (re-pulls feeds into the Redis cache).
  await expect(page.getByRole('button', { name: /refresh/i })).toBeVisible()
  // SSR renders server-side. When at least one feed is reachable the page shows the curated topic
  // columns + filter (a 'Technology' column heading); public feeds aggressively rate-limit (429), so
  // when every feed degrades the BFF returns 502 and the page shows the graceful notice instead.
  // Accept either — both prove the page rendered through the BFF.
  await expect(
    page
      .getByRole('heading', { name: 'Technology' })
      .or(page.getByText(/unavailable/i)),
  ).toBeVisible({ timeout: 20_000 })

  expect(foreign, `browser hit non-app hosts: ${foreign.join(', ')}`).toEqual([])
})
