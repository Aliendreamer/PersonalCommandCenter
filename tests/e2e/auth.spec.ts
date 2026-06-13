import { test, expect } from '@playwright/test'

// Full BFF auth flow against the running stack (everything behind Traefik on *.pcc.localhost).
// Prereqs: `docker compose up -d` and the `Pcc` realm imported. See README.md.

const APP = process.env.PCC_APP_URL ?? 'http://app.pcc.localhost'
const API = process.env.PCC_API_URL ?? 'http://api.pcc.localhost'
const USER = process.env.PCC_TEST_USER ?? 'testuser'
const PASS = process.env.PCC_TEST_PASS ?? 'Test123!'

test('login → dashboard behind login → instant revocation', async ({ page, context }) => {
  // 1. Unauthenticated visit bounces to Keycloak.
  await page.goto(`${APP}/`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#username', { timeout: 30_000 })
  expect(page.url()).toContain('keycloak.pcc.localhost')

  // 2. Log in.
  await page.fill('#username', USER)
  await page.fill('#password', PASS)
  await page.click('#kc-login')

  // 3. Back on the app, behind login: identity chip + plugin nav render.
  await page.waitForURL(/app\.pcc\.localhost/, { timeout: 30_000 })
  await expect(page.getByText('Logout')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('link', { name: 'System' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Devices' })).toBeVisible()

  // 4. /api/me with the session cookie returns the JIT-provisioned identity.
  const me = await page.evaluate(async (api) => {
    const r = await fetch(`${api}/api/me`, { credentials: 'include' })
    return { status: r.status, body: r.ok ? await r.json() : null }
  }, API)
  expect(me.status).toBe(200)
  expect(me.body.roles).toContain('User')

  // 5. Capture the opaque session cookie for the revocation check.
  const sid = (await context.cookies()).find((c) => c.name === 'mp_sid')
  expect(sid).toBeTruthy()

  // 6. Logout revokes the session server-side.
  await page.goto(`${API}/api/auth/logout`, { waitUntil: 'domcontentloaded' })

  // 7. Reusing the old cookie is rejected (no browser CORS via the API request context).
  await context.addCookies([
    { name: 'mp_sid', value: sid!.value, domain: '.pcc.localhost', path: '/' },
  ])
  const afterLogout = await context.request.get(`${API}/api/me`)
  expect(afterLogout.status()).toBe(401)
})

test('api endpoints require a session', async ({ request }) => {
  expect((await request.get(`${API}/api/plugins`)).status()).toBe(401)
  expect((await request.get(`${API}/api/me`)).status()).toBe(401)
  // Health stays anonymous.
  expect((await request.get(`${API}/health`)).status()).toBe(200)
})
