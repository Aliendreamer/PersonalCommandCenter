import { test, expect } from '@playwright/test'

// Search plugin against the live stack (self-hosted SearXNG). Browser only talks to app./keycloak.
// Prereqs: `docker compose up -d` with searxng + the realm imported. See README.md.

const APP = process.env.PCC_APP_URL ?? 'http://app.pcc.localhost'
const USER = process.env.PCC_TEST_USER ?? 'testuser'
const PASS = process.env.PCC_TEST_PASS ?? 'Test123!'

test('search: SSR page + query-driven results through the BFF, app-only', async ({ page }) => {
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

  await expect(page.getByRole('link', { name: 'Search' }).first()).toBeVisible({ timeout: 15_000 })

  // Bare /search is server-rendered with the box + an idle prompt (no API call).
  await page.goto(`${APP}/search`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Search' })).toBeVisible()
  await expect(page.getByText(/enter a query/i)).toBeVisible()

  // A query renders results server-side: navigating to /search?q=… reruns the loader.
  await page.goto(`${APP}/search?q=tanstack`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('link').filter({ hasText: /tanstack/i }).first()).toBeVisible({
    timeout: 20_000,
  })

  expect(foreign, `browser hit non-app hosts: ${foreign.join(', ')}`).toEqual([])
})
