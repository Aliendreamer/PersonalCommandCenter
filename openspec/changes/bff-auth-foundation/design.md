## Context

PCC's `core-api` is a .NET minimal-API plugin host with no auth, reachable on direct ports behind
a CORS lock. We are adding revocable authentication before exposing the command center beyond
localhost/Tailscale, and simultaneously migrating the backend to FastEndpoints and moving the whole
stack onto a Traefik + `*.pcc.localhost` substrate. The full, section-by-section design (with the
exact token/cookie/PKCE recipe) lives at `docs/superpowers/specs/2026-06-13-bff-auth-foundation-design.md`
and `bff-auth-template.md`; this document captures the decisions and rationale.

## Goals / Non-Goals

**Goals:**
- BFF "World B" cookie-session auth: the API owns OIDC tokens; the browser holds only an opaque
  `HttpOnly` `mp_sid`; a Postgres session store gives **instant server-side revocation**.
- Migrate `core-api` from minimal API to **FastEndpoints**; redefine `IPlugin` for endpoint-class
  discovery.
- Full cutover to **Traefik + `*.pcc.localhost`**; everything reached through Traefik.
- **Whole app behind login**; existing `system`/`iot` plugins and the web shell keep working behind
  the gate.

**Non-Goals:**
- Per-plugin role gating beyond "authenticated" (later).
- The calendar/notifications/search plugins (resume after this).
- Production HTTPS/real-DNS hardening (same compose, different DNS later).
- 2FA, API tokens, inbound webhooks (later platform capabilities).

## Decisions

- **World B (API owns tokens)** over SPA-token-in-JS (XSS-exposed, no revocation) or FE-server-owns
  (makes the FE a data hop, fights the API-centric plugin host). World B keeps `srvx`, gives instant
  revocation, and fits the plugin host.
- **FastEndpoints replaces minimal API** (user-mandated). `IPlugin` drops `MapEndpoints`; plugin
  endpoints are FastEndpoints classes discovered via the `pluginAssemblies` already collected.
- **Consolidated components** (vs the template's ~15 small classes): `OidcProtocol` (pure: PKCE,
  state, returnTo sanitize, sub read, token gen+hash), `KeycloakClient` (OIDC HTTP), `SessionService`
  (session lifecycle + cookie + resolve/refresh/revoke/purge), `CurrentUser` (identity + JIT
  provisioning + roles) + thin adapters (`CookieJwtBearerEvents`, `CurrentUserPreProcessor`,
  `SessionCleanupHostedService`). One `AuthOptions` (nested Keycloak/Cookies/Store); `PccDbContext`
  configures entities inline.
- **`SameSite=Lax`** (not Strict/None): enabled by the shared registrable parent `pcc.localhost`;
  keeps the OIDC redirect navigations working, preserves CSRF posture (blocks cross-site subresource
  requests; callback further guarded by PKCE+state nonce), and needs no `Secure` on localhost.
- **Full cutover to Traefik** (not coexist): one clean substrate; the session cookie only exists on
  the `*.pcc.localhost` path anyway. The standalone Portainer is **kept** and routed via a Traefik
  **file provider** (not rebuilt); HA UI exposed at `ha.pcc.localhost` (core-api still calls HA
  internally).
- **Whole app behind login**: only auth endpoints + health are anonymous; the shell renders after a
  client-side `/me` probe (client-only query → no SSR 401 loop).

## Risks / Trade-offs

- [Large, entangled "one big change" (framework + substrate + auth + FE)] → Phase the tasks
  (migration → substrate → auth backend → FE → E2E); each phase ends green before the next.
- [FastEndpoints migration could regress existing endpoint behavior] → Migrate `system`/`iot`/
  `plugins` test-first with identical behavior; adapt existing tests; gates green before auth work.
- [Keycloak issuer mismatch between browser and api container] → `KC_HOSTNAME=http://keycloak.pcc.localhost`
  + api `extra_hosts: keycloak.pcc.localhost:host-gateway` (template gotcha #3).
- [Realm-import / post-logout-uri pitfalls] → post-logout URIs in client `attributes`, `##`-separated
  (template gotcha #4).
- [Cutover breaks the working IoT E2E URLs] → re-verify the IoT path on `*.pcc.localhost` as part of
  E2E; HA already onboarded (token in `.env`).
- [Standalone Portainer reachability from Traefik] → Traefik file-provider service targets the
  running instance over the host gateway; Portainer keeps its own ports/login.

## Migration Plan

1. **FastEndpoints migration** — host + `IPlugin` contract + rewrite `system`/`iot`/`plugins`
   endpoints; all existing gates green (behavior identical).
2. **Substrate** — add `traefik`/`keycloak`/`postgres` to compose, Traefik labels, drop direct
   ports, route HA UI + standalone Portainer; realm JSON import.
3. **Auth backend** — EF Core `Users`/`UserSessions` + migrations; `OidcProtocol`/`KeycloakClient`/
   `SessionService`/`CurrentUser` + adapters; `login`/`callback`/`logout`/`me`; gate all non-auth
   endpoints.
4. **Frontend** — remove FE→API proxy; `lib/api.ts` credentialed + 401 redirect; 2-file auth module;
   authed-layout gate; nav identity/logout chip; env `VITE_API_URL=http://api.pcc.localhost/api`.
5. **E2E** — `docker compose up`; Playwright: logged-out shell → login `testuser/Test123!` →
   dashboard renders → `/api/me` 200/401 → revocation.

**Rollback:** revert the change branch/commits; the prior direct-port compose + minimal-API host is
restored from git. No destructive data migration (new Postgres tables only).

## Open Questions

None blocking — the brainstorm resolved scope, transition (full cutover), protection (whole app
behind login), framework (FastEndpoints), and Portainer handling.
