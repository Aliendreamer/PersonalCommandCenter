import { test, expect } from '@playwright/test'

// Notifications plugin against the live stack (alert-bus + ntfy). The host seeds a "Command center
// online" notification on boot. Browser only talks to app./keycloak. Prereqs: `docker compose up -d`.

const APP = process.env.PCC_APP_URL ?? 'http://app.pcc.localhost'
const USER = process.env.PCC_TEST_USER ?? 'testuser'
const PASS = process.env.PCC_TEST_PASS ?? 'Test123!'

test('notifications: SSR center shows the startup alert, mark-all clears the unread tile, app-only', async ({
  page,
}) => {
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

  await expect(page.getByRole('link', { name: 'Notifications' }).first()).toBeVisible({
    timeout: 15_000,
  })

  // The /notifications page is server-rendered and shows the startup notification.
  await page.goto(`${APP}/notifications`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()
  await expect(page.getByText('Command center online').first()).toBeVisible({ timeout: 15_000 })
  await page.waitForLoadState('networkidle')

  // Mark everything read (the host seeds an unread one each boot; a prior run may have cleared it).
  const markAll = page.getByRole('button', { name: 'Mark all read' })
  if ((await markAll.count()) > 0) {
    await expect(async () => {
      await markAll.click()
      await expect(markAll).toHaveCount(0, { timeout: 2000 })
    }).toPass({ timeout: 20_000 })
  }

  // The dashboard's unread tile now reads "All caught up".
  await page.goto(`${APP}/`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('All caught up').first()).toBeVisible({ timeout: 15_000 })

  expect(foreign, `browser hit non-app hosts: ${foreign.join(', ')}`).toEqual([])
})
