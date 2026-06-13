## Why

The web app is SSR, but the browser bypasses the always-on SSR server and calls `api.pcc.localhost`
directly. That forces a `Domain`-scoped cookie (no `__Host-`), client-side auth gating (a `/me`
"Loading…" flash, no SSR data), and a publicly-exposed API. Making the SSR server the BFF tier in
front of `.NET` fixes all three while keeping `.NET` the auth authority. Full design:
`docs/superpowers/specs/2026-06-14-ssr-bff-auth-v2-design.md`.

## What Changes

- **BREAKING:** **Full cutover** — the browser talks only to `app.pcc.localhost`. Drop
  `api.pcc.localhost`'s public Traefik route; `core-api` is reachable only internally (`core-api:8080`).
  `keycloak.pcc.localhost` stays public (browser login page).
- The SSR server runs an **`/api/auth/*` cookie-re-homing proxy**: proxies login/callback/logout to
  `core-api`, rewrites `Set-Cookie` to **app-scoped** (strip `Domain`; `Secure`+`__Host-` in prod),
  and forwards the session to `core-api` as `Cookie: mp_sid=…`.
- The SSR server adds **`lib/server/*` server functions** (`getMe`, `getPlugins`, `getSystemStatus`,
  `getIotEntities`) that forward the session cookie to `core-api` server-to-server; route **loaders**
  call them so SSR renders **with data**.
- **BREAKING (FE):** replace the client `AuthProvider` `/me` probe with an `_authenticated`
  `beforeLoad` guard + router context; remove `lib/api.ts` (browser client) and the `routes/api/$.ts`
  pattern. Tiles/dashboard/devices read loader data instead of `useEffect` fetches.
- **Config only on `.NET`:** Keycloak client `redirectUri` and `Auth__Keycloak__CallbackUri` move to
  `http://app.pcc.localhost/api/auth/callback`. **No `.NET` code changes** — it stays the auth
  authority (OIDC, tokens, Postgres session, refresh, instant revocation).

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `auth`: the browser-facing auth surface moves to the SSR server (cookie re-homing proxy + the
  session cookie becomes app-scoped/`__Host-`); `.NET` stays the authority; the OIDC callback returns
  to `app.pcc.localhost`.
- `web-shell`: data is fetched **server-side** via server functions (SSR-with-data), and auth is
  gated via `beforeLoad` + router context (no client-side `/me` probe), with the browser calling only
  the SSR server.

## Impact

- **Infra:** `docker-compose.yml` (drop `api.` Traefik route), `harness/keycloak/Pcc-realm.json`
  (`redirectUri`), `core-api` env (`CallbackUri`), `apps/web/Dockerfile` (server-side `API_URL` to
  `core-api:8080`; drop browser `VITE_API_URL`).
- **Web code:** add SSR `/api/auth/*` proxy + cookie re-homing util + `lib/server/*` server fns +
  `_authenticated` layout/guard + router context; convert routes/tiles to loaders; remove
  `lib/api.ts`, `lib/auth/AuthProvider.tsx` (probe), `routes/api/$.ts`.
- **Tests:** new web unit tests (server fns, re-homing, guard); rewrite `tests/e2e` for app-only
  ingress. `.NET` tests unchanged.
