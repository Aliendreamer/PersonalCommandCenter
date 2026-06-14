import { test, expect } from '@playwright/test'

// SSR-BFF auth flow against the running stack. The browser only ever talks to `app.pcc.localhost`
// (and Keycloak for the login form); core-api is internal-only. The always-on TanStack SSR server
// proxies `/api/auth/*` and fetches page data server-to-server. Prereqs: `docker compose up -d`
// with the `Pcc` realm imported. See README.md.

const APP = process.env.PCC_APP_URL ?? 'http://app.pcc.localhost'
const USER = process.env.PCC_TEST_USER ?? 'testuser'
const PASS = process.env.PCC_TEST_PASS ?? 'Test123!'

test('SSR-BFF: login → server-rendered dashboard with data → instant revocation', async ({
  page,
  context,
}) => {
  // 1. Anonymous visit: the `_authenticated` guard runs on the SSR server and bounces to Keycloak.
  await page.goto(`${APP}/`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#username', { timeout: 30_000 })
  expect(page.url()).toContain('keycloak.pcc.localhost')

  // 2. Log in.
  await page.fill('#username', USER)
  await page.fill('#password', PASS)
  await page.click('#kc-login')

  // 3. Back on the app (same origin throughout): identity chip + plugin nav render.
  await page.waitForURL(/app\.pcc\.localhost/, { timeout: 30_000 })
  await expect(page.getByText('Logout')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('link', { name: 'System' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Devices' })).toBeVisible()

  // 4. SSR-with-data: the raw server HTML (cookie carried by the shared request context, no client
  //    JS) already contains the identity and the live system-tile data — proving data is fetched
  //    server-side via loaders, not by a browser probe. No "Loading…" placeholder is ever shown.
  const html = await (await context.request.get(`${APP}/`)).text()
  expect(html).toContain('Hello,')
  expect(html).toContain('Healthy')
  expect(html).not.toContain('Loading…')

  // 5. Capture the opaque, app-scoped session cookie for the revocation check.
  const sid = (await context.cookies()).find((c) => c.name === 'mp_sid')
  expect(sid).toBeTruthy()

  // 6. Logout revokes the session server-side (Postgres session store).
  await page.goto(`${APP}/api/auth/logout`, { waitUntil: 'domcontentloaded' })

  // 7. Present the revoked cookie straight to the SSR guard (no Keycloak SSO round-trip, which could
  //    silently re-mint a session): getMe() gets a 401 from core-api, so instead of serving the
  //    dashboard the server redirects to the login proxy. A valid cookie would have returned 200.
  await context.clearCookies()
  await context.addCookies([
    { name: 'mp_sid', value: sid!.value, domain: 'app.pcc.localhost', path: '/' },
  ])
  const revoked = await context.request.get(`${APP}/`, { maxRedirects: 0 })
  expect([302, 307]).toContain(revoked.status())
  expect(revoked.headers()['location']).toContain('/api/auth/login')
})

test('api.pcc.localhost is not publicly routable (core-api is internal-only)', async ({
  request,
}) => {
  // Traefik no longer has an `api.` router — every path 404s at the edge.
  expect((await request.get('http://api.pcc.localhost/api/me')).status()).toBe(404)
  expect((await request.get('http://api.pcc.localhost/api/plugins')).status()).toBe(404)
  expect((await request.get('http://api.pcc.localhost/health')).status()).toBe(404)
})
