# SSR-BFF Auth v2 — Design

**Date:** 2026-06-14
**Status:** Approved (brainstorm) — pending implementation plan
**Supersedes (for this repo):** the Direct-BFF split in `bff-auth-direct-template.md` / the `auth` capability,
where the browser talked to `api.pcc.localhost` directly. `.NET` remains the auth authority.

## Context & motivation

The web app is SSR (TanStack Start) — the server runs on every request anyway. Today (Direct BFF) the
browser bypasses it and calls `api.pcc.localhost` directly, so: the session cookie must be
`Domain`-scoped (can't use `__Host-`), auth is gated **client-side** (`AuthProvider` probes `/api/me`
after hydration → a "Loading…" flash, no SSR data), and `api.` is publicly exposed.

This change makes the **always-on SSR server the BFF tier**: the browser talks only to
`app.pcc.localhost`; the SSR server proxies auth and fetches data **server-to-server** from
`core-api`. `.NET` keeps everything it owns — Keycloak OIDC exchange, access/refresh tokens, the
Postgres session store, refresh, and **instant revocation**. We get SSR-with-data, a single origin
(`__Host-` in prod), a hidden API, and same-origin CSRF — without moving the auth authority.

## Goals / Non-Goals

**Goals**
- Browser talks only to `app.` (full cutover); `api.pcc.localhost` loses its public Traefik route.
- SSR renders fully-populated pages (no client-side `/me` flash, no client data fetch).
- `__Host-`-prefixed session cookie in production (single origin); app-scoped (no `__Host-`) on the
  HTTP localhost harness.
- `.NET` unchanged as the auth authority — only `CallbackUri`/Keycloak `redirectUri` config moves.

**Non-Goals**
- Moving OIDC/token logic out of `.NET` (Approach B — rejected).
- CSRF tokens for mutations (no mutating endpoints yet — set up the same-origin pattern only).
- The `calendar` plugin (this change precedes it so the FE data layer is settled first).
- Live HTTPS `__Host-` verification (prod concern).

## Decisions

- **Approach A — thin re-homing ingress** (over B "FE owns auth" / C "data-only"). The SSR server
  is the single public ingress: an `/api/auth/*` cookie-re-homing proxy **+** typed server functions
  for data/identity. `.NET` keeps its verified login/callback/logout/PKCE/session/refresh/revocation
  logic; only `CallbackUri` config changes. Lowest risk, reuses everything tested.
- **One session, one authority.** The browser holds the *same* opaque session token, only re-homed
  (Domain stripped; `__Host-` in prod). No second session store. `.NET` owns refresh/expiry/revoke.
- **Cookie forwarding, not headers.** The SSR server forwards the session to `core-api` as
  `Cookie: mp_sid=<value>` — the name `.NET`'s `CookieJwtBearerEvents` already reads → zero `.NET`
  change. (Header forwarding was the alternative; rejected for needing a `.NET` change.)
- **Server-side guard.** Replace the client `AuthProvider` probe with an `_authenticated` layout
  route `beforeLoad` → `getMe()` server fn → router context (idiomatic TanStack, runs during SSR,
  no flash).

## Architecture

```
                         Traefik (:80) — public routes:
  app.pcc.localhost      ──► web (SSR)        ← the ONLY app surface the browser uses
  keycloak.pcc.localhost ──► keycloak          ← browser needs it for the login page
  (api.pcc.localhost: PUBLIC ROUTE REMOVED — core-api reachable only as core-api:8080 internally)

  Browser ──same-origin, __Host- cookie──► web (SSR) ──server-to-server──► core-api ──► keycloak
                                            (re-homes cookie,                (OIDC, tokens,
                                             forwards session)                Postgres session)
```

- **`web` (SSR)** = single public ingress: `/api/auth/*` re-homing proxy + `lib/server/*` server
  functions for data/identity.
- **`core-api`** = internal only (drop public Traefik route); auth authority unchanged.
- **`keycloak`** = stays public (browser login page); `core-api` reaches it internally for token
  exchange + issuer validation.
- **Config deltas:** Keycloak client `redirectUri` and `.NET Auth__Keycloak__CallbackUri` →
  `http://app.pcc.localhost/api/auth/callback`.

## Auth flow & cookie re-homing

1. Unauthenticated load → guard `beforeLoad` sees no session → 302 `app./api/auth/login?returnTo=/`.
2. SSR proxies → `core-api/api/auth/login`; `core-api` sets `mp_pkce` + 302s to Keycloak authorize.
3. SSR **re-homes `mp_pkce`** (strip `Domain`; app-scoped; `Secure`+`__Host-` in prod) and relays the
   302 → browser → `keycloak.pcc.localhost`.
4. User authenticates → Keycloak 302s the browser to `app.pcc.localhost/api/auth/callback?code&state`.
5. SSR proxies the callback to `core-api` (forwarding `mp_pkce`); `core-api` verifies the state
   nonce, exchanges the code (→ keycloak internal), creates the Postgres session, 302s to
   `{AppBaseUrl}{returnTo}` + `Set-Cookie mp_sid`.
6. SSR **re-homes `mp_sid`** and relays → browser lands on the dashboard with the session cookie.

**Authenticated calls:** browser → SSR (loaders/server fns); the SSR handler reads the app-scoped
session cookie and forwards `Cookie: mp_sid=<value>` to `core-api`. `.NET` resolves the session
unchanged; `[Authorize]` is the real data boundary.

**Logout:** `app./api/auth/logout` → SSR proxy → `core-api` (revoke + clear + end-session 302) →
SSR re-homes the clear → browser.

**Re-homing rules (one small unit):**

| | Browser-facing (set by SSR) | Sent to `core-api` |
|---|---|---|
| Domain | none (app-scoped) | n/a |
| Name (dev/http) | `mp_sid` / `mp_pkce` | `mp_sid` / `mp_pkce` |
| Name (prod/https) | `__Host-mp_sid` / `__Host-mp_pkce` + `Secure` | mapped back to `mp_sid` / `mp_pkce` |
| Flags | `HttpOnly`, `SameSite=Lax`, `Path=/` | — |

## Data flow & guard

- **`getMe()`** (server-only): reads the session cookie, fetches `core-api/api/me` (cookie
  forwarded); returns `Me | null` (401 → null).
- **`_authenticated` layout route** `beforeLoad` → `getMe()` → router context `me`; `null` →
  `redirect()` to the login proxy. Runs during SSR (the server now has the cookie) → no flash.
- **Data server fns** `getPlugins()` / `getSystemStatus()` / `getIotEntities()` (server-only, forward
  cookie, reuse `@pcc/contracts` types). Route **loaders** call them → SSR renders **with data**.
- Nav identity chip reads `me` from router context.

**Removed/replaced:** `lib/api.ts` browser client → `lib/server/*` server fns; `AuthProvider` probe →
`beforeLoad` guard; tile `useEffect` fetches → loader data. `forbidden.tsx` kept (RBAC).

**Net:** the browser makes zero calls to `core-api`.

## Error handling

- Session expired/revoked mid-use → `core-api` 401 → `getMe()` null (guard redirects) / data fns
  `throw redirect()` to login.
- `core-api` 5xx → dashboard degrades (empty + non-blocking error) per the `web-shell` requirement.
- IoT 502 (HA down) → Devices tile/page degraded "unavailable" (unchanged).
- Stale `mp_pkce` → `core-api` callback nonce mismatch → SSR relays error → restart login. `returnTo`
  stays sanitized in `.NET`.
- CSRF: same-origin browser↔SSR + `SameSite=Lax` → cross-site can't forge. Read-only today; add an
  Origin check when mutations land.

## Testing & gates

- **.NET:** unchanged (46 tests pass; only `CallbackUri` config moves).
- **Web unit (vitest):** server fns forward the cookie + map `401→null`/data (mock `core-api` fetch);
  the re-homing proxy (Domain stripped, dev/prod name mapping, flags); the `beforeLoad` guard.
- **E2E (`tests/e2e`):** rewritten for app-only ingress — browser hits only `app.pcc.localhost`;
  login through Keycloak; assert the dashboard renders **with data server-side**; revocation via
  `app.`; assert `api.pcc.localhost` is **not** publicly routable.
- **Gates:** .NET trio + web typecheck/lint/test/build/prettier + E2E green.

## Capabilities (for the OpenSpec change)

- Modify `auth`: the browser-facing auth surface moves to the SSR server (cookie re-homing proxy);
  `.NET` stays the authority; cookie is app-scoped/`__Host-`.
- Modify `web-shell`: data fetched server-side via server functions (SSR-with-data); auth gated via
  `beforeLoad`/router context (no client probe).
