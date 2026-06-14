# BFF Auth Foundation — Design

**Date:** 2026-06-13
**Status:** Approved (brainstorm) — pending implementation plan
**Reference recipe:** repo-root `bff-auth-direct-template.md` (the exact token/cookie/PKCE recipe;
this doc is the PCC-specific adaptation and decisions, not a re-statement of it).

## Context & motivation

PCC currently has no authentication — `core-api` (a .NET minimal-API plugin host) is reachable
on direct ports with only a CORS lock. Before the command center is exposed beyond localhost /
Tailscale it needs real auth. We are adopting the **Direct-BFF cookie-session** model from
`bff-auth-direct-template.md`: the .NET API owns the OIDC code exchange and tokens, the browser holds
only an opaque `HttpOnly` session cookie, and a Postgres session store gives **instant
server-side revocation**.

This change also pulls in a backend framework migration and a runtime-substrate cutover, done
as **one OpenSpec change** (user decision).

## Locked decisions

1. **FastEndpoints replaces the minimal API** across `core-api` (mandatory). This changes the
   `IPlugin` contract (see Backend).
2. **Direct-BFF** token ownership: the .NET API holds tokens; browser gets only `mp_sid`.
3. **Full cutover** to **Traefik + `*.pcc.localhost`** — drop the direct `:5080/:3000/:8123`
   host ports; only Traefik publishes `:80`.
4. **Whole app behind login** — only the auth endpoints + health are anonymous; everything else
   (incl. `/api/plugins`, `system`, `iot`) requires a session.
5. **Self-contained harness Keycloak + Postgres** added to `docker-compose.yml` (same pattern as
   `home-assistant`). Realm `Pcc`, confidential client `pcc_api`, roles `Admin`/`User`, seed
   user `testuser/Test123!`.
6. **Keep `srvx`** for the web FE (the `-s ../client` fix stays); Traefik routes to it.
7. **`SameSite=Lax`** for `mp_sid`/`mp_pkce` — enabled by the shared registrable domain
   (`pcc.localhost`); needs no `Secure` on localhost; preserves CSRF posture while allowing the
   OIDC redirect navigations. (Deployment stays same-compose/same-parent-domain, just real DNS.)
8. **Consolidated components** — fewer, cohesive services instead of the template's ~15 small
   classes (see Backend / Frontend).
9. **Portainer** — keep the existing **standalone** Portainer (do **not** retire it, do **not**
   build a second one in compose). Expose it behind Traefik at `portainer.pcc.localhost` via a
   Traefik dynamic **file-provider** route to the already-running instance. Portainer keeps its
   own login (not behind Keycloak).
10. **Everything is reached through Traefik** — including the Home Assistant UI
    (`ha.pcc.localhost`) and the standalone Portainer. Only Traefik publishes `:80`.
11. **No demo UI** — the existing dashboard/plugins are the post-login UI. Success is functional
    (E2E), not a bespoke auth page.

## Architecture & substrate

```
                 Traefik v3 (:80, only published port; docker provider; docker.sock ro)
   app.pcc.localhost       ──► web        (srvx SSR, :3000)   shell only, never a data hop
   api.pcc.localhost       ──► core-api   (FastEndpoints, :8080) owns tokens + session
   keycloak.pcc.localhost  ──► keycloak   (26, start-dev --import-realm, :8080)
   ha.pcc.localhost        ──► home-assistant (:8123; UI via Traefik; core-api also calls it
                                              internally over the compose network)
   portainer.pcc.localhost ──► portainer  (EXISTING standalone; routed via Traefik file provider;
                                              own login; not a compose service)
   postgres: internal only (session store)

   Browser ──HttpOnly mp_sid (Domain=.pcc.localhost, SameSite=Lax)──► api.  (credentialed)
```

- `*.localhost` auto-resolves to 127.0.0.1 (RFC 6761) — no `/etc/hosts`/DNS.
- `app.` and `api.` share registrable parent `pcc.localhost` → cookie is same-site → `Lax`, no
  `Secure` in Dev.
- **Compose-managed** services after this change: **`proxy`, `core-api`, `web`,
  `home-assistant`, `keycloak`, `postgres`** — all behind Traefik; only Traefik publishes `:80`.
  The direct `:5080/:3000/:8123` host ports are dropped (full cutover).
- **Traefik uses two providers:** the **docker** provider (labels on the compose services above)
  and a **file** provider (static dynamic config) that routes `portainer.pcc.localhost` to the
  existing standalone Portainer — so it joins "everything behind Traefik" without being rebuilt
  or retired. The standalone keeps its own ports untouched.
- `.env` additions (gitignored): Keycloak client secret, Postgres connection, cookie domain.

## Backend (`core-api` → FastEndpoints + BFF auth)

**Dependencies added** (per template manifest): FastEndpoints (+ Swagger/HealthChecks), EF Core +
Npgsql, `Microsoft.AspNetCore.Authentication.JwtBearer`, FusionCache, Serilog, security headers.
`Scalar.AspNetCore` stays.

### `IPlugin` contract change (architectural ripple)

- **Before:** `Id`, `Manifest`, `Configure(services, config)`, `MapEndpoints(IEndpointRouteBuilder)`.
- **After:** `Id`, `Manifest`, `Configure(services, config)` — **`MapEndpoints` removed**. Plugins
  ship **FastEndpoints endpoint classes** (a route group per plugin, e.g. `iot/`), discovered via
  `AddFastEndpoints(o => o.Assemblies = pluginAssemblies)`. The `Plugins:{Id}:Enabled` activation
  gate stays in `PluginRegistry`; disabled plugins' endpoints are not registered.
- **Migrated endpoints (behavior identical):** `GET api/plugins` → `PluginsEndpoint`
  (`[Authorize]`); `GET api/system/status` → `SystemStatusEndpoint`; `GET api/iot/entities` →
  `GetIotEntitiesEndpoint` (keeps HA client + 502-degraded). Health stays anonymous.

### Consolidated auth components (~4 cohesive units, not ~15)

- **`OidcProtocol`** (static util, pure → unit-tested): PKCE (verifier/challenge S256/nonce),
  state encode/decode, `returnTo` sanitize, JWT `sub` read, session-token generate + SHA-256
  hash. *(collapses `Pkce`, `OidcState(+Codec)`, `ReturnToSanitizer`, `JwtSubjectReader`,
  `SessionToken`)*
- **`KeycloakClient : IKeycloakClient`**: OIDC HTTP — discovery, `BuildAuthorizeUrl`,
  `ExchangeCode`, `Refresh`, `BuildEndSessionUrl`. *(collapses `KeycloakOidcClient` +
  `OidcDiscoveryDocument`)*
- **`SessionService : ISessionService`**: full server-owned session lifecycle — `Create` (issue
  token, persist hash + tokens, set `mp_sid`), `ResolveAccessToken` (read cookie → valid session
  → unexpired token, else `Refresh` via `KeycloakClient` + `UpdateTokens`, else null/401),
  `Revoke` (set `RevokedAt`, clear cookie), `Purge`. *(collapses `SessionStore` +
  `CookieBearerTokenResolver` + cleanup logic)*
- **`CurrentUser : ICurrentUser`** (scoped): holds `{id, sub, email, roles}`;
  `InitializeAsync(principal)` JIT-provisions the local `User` (FusionCache `sub→id`, race-safe)
  and reads `realm_access.roles`. *(collapses `UserProvisioningService` + `CurrentUser` +
  `KeycloakRolesClaimsTransformation`)*

**Thin adapters (no logic):** `CookieJwtBearerEvents.OnMessageReceived` → `SessionService`;
`CurrentUserPreProcessor` (FastEndpoints global) → `CurrentUser.InitializeAsync`;
`SessionCleanupHostedService` (`BackgroundService`) → `SessionService.Purge`.

**Endpoints (thin, group `auth/`, `AllowAnonymous` except `/me`):** `Login` (`GET api/auth/login`),
`Callback` (`GET api/auth/callback`), `Logout` (`GET api/auth/logout`), `Me`
(`GET api/me` `[Authorize]`, `Cache-Control: no-store`).

### Data & config

- **`PccDbContext`** { `Users`, `UserSessions` }, entity config inline in `OnModelCreating` (no
  separate `*Configuration` files). `User`(Id, unique `Sub`, `Email?`, `FullName?`),
  `UserSession`(Id, unique `TokenHash`, indexed `Subject`, `AccessToken`, `RefreshToken?`,
  expiries, `RevokedAt?`), `AuditableEntity`. Migrations `AddUsers`/`AddUserSessions`, applied on
  startup.
- **One `AuthOptions`** bound from `"Auth"` with nested `Keycloak` / `Cookies` / `Store` (not 3
  option classes).
- Cookies `mp_sid`/`mp_pkce`: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Domain=.pcc.localhost`,
  `Secure` outside Dev. CORS: exact `app` origin + `AllowCredentials` (never `*`).

## Frontend (`web`, whole-app-behind-login)

PCC already fetches data client-side, so this is mostly *gating + going direct to the API*.

- **Drop the FE→API server proxy** (`routes/api/$.ts` + SSR `API_URL` hop). Browser calls
  `api.pcc.localhost/api` directly with `credentials:'include'`; `VITE_API_URL=http://api.pcc.localhost/api`.
- **Extend existing `lib/api.ts`**: `credentials:'include'`, no `Authorization` header, `ApiError`
  on non-2xx, `401` (except a `skipAuthRedirect` flag the `/me` probe uses) → full-page redirect
  to `api/auth/login?returnTo=<path>`.
- **Consolidated auth module — 2 files:** `lib/auth/auth-api.ts` (`Me` type + `fetchMe` +
  `meQueryOptions` (client-only, `retry:false`) + `ensureMe` + `login(returnTo)`/`logout()` +
  `requireAuth`/`requireRole` + `ADMIN_ROLE`); `lib/auth/AuthProvider.tsx` (context + `useAuth`).
- **Whole-app gate via an authed layout route:** `beforeLoad` → `ensureMe` → 401 → full-page
  redirect to `api/auth/login`. SSR renders the shell + loading skeleton (`meQuery` is client-only
  → no SSR 401 loop) → hydrate → `/me` 200 → `plugin-shell` fetches `/api/plugins` (credentialed)
  → existing nav/tiles/pages render.
- **No demo pages / no `login.tsx`.** Existing dashboard is the landing. Only new UI: a minimal
  nav identity chip ("{name} · roles · Logout") + a small `forbidden.tsx` for role-gated routes.
  No `/auth/callback` route (API owns it).
- **Serving unchanged:** keep `srvx` (`-s ../client`); Traefik routes `app.pcc.localhost → web:3000`.
  Mind the Tailwind v4 `@source` gotcha so SSR/client CSS hashes match.

## Data flow & error handling

- **Login (cold):** shell → client `GET api/me` (skipAuthRedirect) → 401 → `login(returnTo)` →
  `api/auth/login` (sanitize `returnTo`, PKCE + nonce, set `mp_pkce`, encode state, authorize
  redirect) → Keycloak → `api/auth/callback` (verify `state.nonce == mp_pkce` nonce, exchange code,
  read `sub`, `SessionService.Create`, set `mp_sid`, 302 to absolute `{AppBaseUrl}{returnTo}`) →
  shell → `me` 200 → render.
- **Authed call:** browser → `api/...` credentialed → `OnMessageReceived` → `ResolveAccessToken` →
  JwtBearer validate → `CurrentUserPreProcessor` → endpoint.
- **Transparent refresh:** access expired + refresh valid → `KeycloakClient.Refresh` →
  `UpdateTokens` → new token; refresh invalid → null → 401 → FE login.
- **Logout + instant revocation:** `api/auth/logout` → `Revoke(mp_sid)` (`RevokedAt`) → clear
  cookie → end-session redirect. Reusing old `mp_sid` → `ResolveAccessToken` sees `RevokedAt` →
  401. `SessionCleanupHostedService` purges revoked/expired.
- **Errors:** missing/invalid `mp_pkce`, state nonce mismatch, or exchange failure → safe redirect
  to login, no token leak; `returnTo` sanitized (reject `//`, scheme) → no open redirect; Keycloak
  unreachable → fail closed with friendly error.

## Testing & gates

- **Unit:** `OidcProtocol` (PKCE S256, state round-trip + tamper-reject, `returnTo` cases,
  token-gen + hash-only storage, `sub` read); `SessionService` (EF InMemory + Moq `KeycloakClient`:
  create→persist hash, resolve unexpired, refresh-on-expiry, **revoke→resolve null**, purge);
  `CurrentUser` (JIT upsert by `sub`, cached, roles); `KeycloakClient` (authorize-URL +
  exchange/refresh request shapes via stub handler).
- **Integration (`WebApplicationFactory`):** login → 302 + `mp_pkce`; callback (stubbed Keycloak
  token endpoint) → `mp_sid` + 302; `/me` with session → 200, anon → 401; **revocation: login →
  capture `mp_sid` → logout → reuse → 401**; migrated endpoints (`/api/plugins`,
  `/api/system/status`, `/api/iot/entities`) → 401 anon / 200 authed / iot 502 when HA down.
- **Frontend (vitest + RTL):** `apiFetch` 401 → redirect (mock `location`); `AuthProvider`/`meQuery`
  states; guard redirects; `plugin-shell` renders after auth; nav chip shows name/roles/logout.
- **E2E harness (Playwright, like IoT):** `docker compose up` → services healthy + realm imports →
  logged-out shell → login `testuser/Test123!` → existing dashboard renders → `/api/me` 200 w/
  cookie, 401 without → revocation (logout → reuse cookie → 401). **This functional E2E is the
  success bar.**
- **Quality gates (dev-flow Done Gate):** `.NET` build `-warnaserror` · `dotnet format
  --verify-no-changes` · `dotnet test`; FE `nx affected typecheck/lint/test/build` ·
  `prettier --check`; **E2E harness run green before done**.

## Out of scope (future changes)

- Per-plugin role gating beyond "authenticated" (e.g. Admin-only plugins).
- The calendar / notifications / search plugins (resume after auth foundation).
- Production HTTPS/real-DNS hardening (same compose, different DNS).
- 2FA, API tokens, inbound webhooks (later platform capabilities).
