## 1. Substrate & config cutover (api. internal-only)

- [x] 1.1 `harness/traefik/dynamic.yml`: remove the `api.pcc.localhost` router/service (core-api
      stays reachable only as `core-api:8080` on the compose network). Keep `app.`/`keycloak.`/`ha.`/
      `portainer.`.
- [x] 1.2 `harness/keycloak/Pcc-realm.json`: change client `pcc_api` `redirectUris` to
      `http://app.pcc.localhost/api/auth/callback` (keep `webOrigins` = `http://app.pcc.localhost`).
- [x] 1.3 `docker-compose.yml` core-api env: `Auth__Keycloak__CallbackUri` →
      `http://app.pcc.localhost/api/auth/callback`.
- [x] 1.4 `apps/web/Dockerfile` + compose `web`: server-side `API_URL=http://core-api:8080` (used by
      server functions); drop the browser `VITE_API_URL` build arg.
- [x] 1.5 `docker compose config` valid; note that `core-api` no longer publishes via Traefik.

## 2. SSR auth proxy + cookie re-homing (TDD)

- [x] 2.1 (TDD) `lib/server/cookies.ts` unit tests: re-home a `Set-Cookie` (strip `Domain`,
      app-scoped, `HttpOnly`/`SameSite=Lax`/`Path=/`; dev keeps `mp_sid`/`mp_pkce`, prod uses
      `__Host-…`+`Secure`); build the forward `Cookie` header mapping the app cookie back to
      `mp_sid`/`mp_pkce` → implement the util until green.
- [x] 2.2 Implement the SSR `/api/auth/$` server route: proxy `GET`/`POST` to `core-api/api/auth/*`
      (forwarding the relevant request cookie via `proxyAuth`), re-home each `Set-Cookie`, and relay
      status + `Location` (302) to the browser. The browser only ever sees `app.`/`keycloak.`.
- [x] 2.3 (TDD) proxy test (mock `core-api`): `login` → relays 302 to Keycloak + re-homed PKCE
      cookie; `callback` → re-homed session cookie + 302 to `{AppBaseUrl}{returnTo}`.

## 3. Server functions + guard + SSR-with-data migration (TDD)

- [x] 3.1 (TDD) `lib/server/api.ts` server functions `getMe`/`getPlugins`/`getSystemStatus`/
      `getIotEntities`: read the session cookie, fetch `core-api` over the internal network
      forwarding it, return typed data (`@pcc/contracts`); `getMe` 401 → `null`; data fns 401 →
      `throw redirect()` to login. Pure loaders live in `api-loaders.ts` (unit-tested with a mock
      fetch); the server fns wrap them with a cookie-forwarding `serverFetch`.
- [x] 3.2 `_authenticated` pathless layout route: `beforeLoad` → `getMe()` → router context `me`;
      `null` → `redirect()` to `/api/auth/login?returnTo=<path>`. Root route uses
      `createRootRouteWithContext<{ me }>()`; router created with initial `context: { me: null }`.
- [x] 3.3 Convert dashboard/index, system tile, iot-summary tile, and `/devices` to **route loaders**
      that call the server functions (SSR renders with data; tiles are now presentational, data via
      props; `settle()` degrades a single source without breaking the page); nav identity chip reads
      `me` from `_authenticated` route context.
- [x] 3.4 Removed `lib/api.ts` (browser client), `AuthProvider`/`auth-api.ts` (`/me` probe), and the
      old top-level routes. `forbidden.tsx` kept (under `_authenticated/`); `login()`/`logout()`
      helpers (`lib/auth/session.ts`) point at same-origin `/api/auth/*`.
- [x] 3.5 `pnpm --filter web generate-routes`; FE gates green: `nx run-many -t typecheck lint test
      build` (web + `@pcc/contracts`) + `prettier --check`. 29 web tests pass.

## 4. E2E verification + done gate

- [x] 4.1 `docker compose up -d --build` → `app.`/`keycloak.`/`core-api`(internal)/`postgres`/`ha`
      healthy; realm imports (fresh keycloak container). **Verified `api.pcc.localhost` is NOT
      publicly routable** (`Host: api.pcc.localhost` → 404; `app./` → 307 guard redirect;
      `app./api/auth/login` → 302 Keycloak + re-homed `mp_pkce`).
- [x] 4.2 Rewrote `tests/e2e/auth.spec.ts` for app-only ingress: browser hits only `app.`; login
      `testuser/Test123!`; **dashboard server-rendered with data** (raw SSR HTML carries `Hello,` +
      `Healthy`, no "Loading…"); **revocation** (logout → present revoked cookie to the SSR guard →
      302/307 to `/api/auth/login`); plus an `api.` → 404 test. Both pass, deterministically.
- [x] 4.3 Full gates green: .NET trio (unchanged — **46** green, build 0 errors, format clean) + FE
      typecheck/lint/test (**29**)/build/prettier + the **2** E2E tests.
- [x] 4.4 Updated `CLAUDE.md` (SSR-BFF ingress; `api.` internal; server functions; cookie re-homing;
      `COOKIE_SECURE`; server-route type augmentation). Tasks complete; ready for `/opsx:archive`.
