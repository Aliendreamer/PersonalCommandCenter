## Why

PersonalCommandCenter has no authentication — `core-api` is reachable on direct ports with only
a CORS lock. Before the command center is exposed beyond localhost / Tailscale it needs real,
revocable auth. We adopt the BFF "World B" cookie-session model (the API owns OIDC tokens; the
browser holds only an opaque `HttpOnly` session cookie; a Postgres session store gives instant
server-side revocation), per the approved design and `bff-auth-template.md`.

## What Changes

- **BREAKING:** Migrate `core-api` from ASP.NET **minimal API to FastEndpoints**. The `IPlugin`
  contract drops `MapEndpoints`; plugin endpoints become FastEndpoints classes discovered via the
  plugin assemblies. `system`/`iot`/`plugins` endpoints are rewritten (behavior identical).
- **BREAKING:** **Full substrate cutover** to **Traefik + `*.pcc.localhost`**. Drop the direct
  `:5080/:3000/:8123` host ports; add `traefik`, `keycloak`, `postgres` services; route the
  existing standalone Portainer and the Home Assistant UI through Traefik. Only Traefik publishes
  `:80`.
- Add **BFF auth**: Keycloak OIDC (PKCE + state), a Postgres-backed server-owned session with
  `mp_sid`/`mp_pkce` cookies (`SameSite=Lax`, `Domain=.pcc.localhost`), transparent refresh, and
  **instant revocation on logout**. Endpoints `api/auth/login|callback|logout` and `api/me`.
- **BREAKING:** **Whole app behind login** — every endpoint except the auth endpoints and health
  requires a session; the web shell renders only after `/me` succeeds.
- **Frontend:** remove the FE→API server proxy (browser calls `api.pcc.localhost/api` directly,
  credentialed), add a 2-file auth module + an authed-layout gate + a nav identity/logout chip.
  Keep `srvx` serving.

## Capabilities

### New Capabilities
- `auth`: BFF cookie-session authentication — Keycloak OIDC login/callback/logout, server-owned
  Postgres session with instant revocation, `/api/me` identity, transparent token refresh, and the
  "whole app behind login" gating rule.

### Modified Capabilities
- `plugin-host`: the host runs on **FastEndpoints**; `IPlugin` drops `MapEndpoints` and plugin
  endpoints are FastEndpoints classes discovered from the plugin assemblies; all non-auth endpoints
  require an authenticated session.
- `web-shell`: the shell sits **behind login** (renders after `/me`), fetches data **directly from
  the API** (browser→`api.pcc.localhost`, credentialed) with **no FE→API proxy**, and shows a nav
  identity/logout affordance.

## Impact

- **Code:** `apps/core-api` (FastEndpoints migration + all auth components + EF Core data layer +
  migrations), `libs/plugin-abstractions` (`IPlugin` contract), `plugins/system` + `plugins/iot`
  (endpoint rewrite), `apps/web` (auth module, authed layout, remove proxy, nav chip, env).
- **Infra:** `docker-compose.yml` (add `traefik`/`keycloak`/`postgres`; Traefik labels; drop direct
  ports; HA + standalone-Portainer routed via Traefik), `harness/keycloak/Pcc-realm.json`, `.env`
  (Keycloak secret, Postgres conn, cookie domain).
- **Dependencies (.NET):** FastEndpoints (+ Swagger/HealthChecks), EF Core + Npgsql, JwtBearer,
  FusionCache, Serilog, security headers.
- **Tests:** new auth unit/integration/E2E; existing endpoint + web tests updated for the auth gate.
