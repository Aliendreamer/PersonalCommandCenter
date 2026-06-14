## Context

The web app is SSR but the browser bypasses the SSR server and calls `core-api` directly (World B).
This change makes the always-on SSR server the BFF tier: the browser talks only to
`app.pcc.localhost`; the SSR server re-homes the session cookie and proxies auth + fetches data
server-to-server from `core-api`. `.NET` stays the auth authority. Full design:
`docs/superpowers/specs/2026-06-14-ssr-bff-auth-v2-design.md`.

## Goals / Non-Goals

**Goals:** browser→SSR-only (full cutover); `api.` internal-only; SSR renders with data (no client
`/me` flash); app-scoped/`__Host-` cookie; `.NET` unchanged as authority (config-only delta).

**Non-Goals:** moving OIDC/token logic out of `.NET`; CSRF tokens for mutations (none yet); the
`calendar` plugin; live HTTPS `__Host-` verification.

## Decisions

- **Approach A — thin re-homing ingress** (vs B "FE owns auth" / C "data-only"): SSR server =
  `/api/auth/*` cookie-re-homing proxy + typed server functions for data/identity; `.NET` keeps its
  verified auth logic, only `CallbackUri` config moves. Lowest risk.
- **One session, one authority:** browser holds the same opaque token re-homed (no second store);
  `.NET` owns refresh/expiry/revoke.
- **Cookie forwarding, not headers:** SSR forwards `Cookie: mp_sid=<value>` to `core-api` (the name
  its resolver already reads) → zero `.NET` code change.
- **Server-side guard:** `_authenticated` `beforeLoad` → `getMe()` → router context, replacing the
  client `AuthProvider` probe (idiomatic TanStack, runs during SSR, no flash).

## Risks / Trade-offs

- [Reworks the verified World-B FE auth] → `.NET` stays untouched; phase the FE change and keep the
  46 .NET tests + a rewritten E2E as the safety net.
- [`__Host-` needs HTTPS; local harness is HTTP] → app-scoped cookie locally, `__Host-`+`Secure` only
  in production; cookie-name mapping handles both.
- [SSR proxy must relay redirects + cookies correctly across the OIDC dance] → focused unit tests on
  the re-homing util + an E2E through the real Keycloak.
- [`api.` removed publicly → Scalar/API docs internal] → reach via `docker exec`; non-blocking.
- [E2E previously hit `api.` directly] → rewrite to app-only ingress; assert `api.` not routable.

## Migration Plan

1. **Substrate/config:** drop `api.` Traefik route (core-api internal); Keycloak `redirectUri` +
   `.NET CallbackUri` → `app.pcc.localhost/api/auth/callback`; web Dockerfile server-side
   `API_URL=core-api:8080`, drop browser `VITE_API_URL`.
2. **SSR auth proxy:** `/api/auth/*` route that proxies to `core-api` with cookie re-homing
   (strip `Domain`; app-scoped/`__Host-`+`Secure` in prod) and session forwarding.
3. **Server functions + guard:** `lib/server/*` (`getMe`/`getPlugins`/`getSystemStatus`/
   `getIotEntities`); `_authenticated` `beforeLoad` + router context; convert tiles/dashboard/devices
   to loaders; remove `lib/api.ts`, the `AuthProvider` probe, `routes/api/$.ts`.
4. **E2E:** rewrite `tests/e2e` for app-only ingress; verify login → SSR-with-data → revocation; assert
   `api.` not publicly routable.

**Rollback:** revert the change commits; the prior World-B compose + FE auth is restored from git.
No data migration.

## Open Questions

None blocking — brainstorm resolved cutover (full), session model (single, re-homed), forwarding
(cookie), guard (beforeLoad), and `__Host-` dev/prod handling.
