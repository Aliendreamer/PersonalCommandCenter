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

- [ ] 3.1 (TDD) `lib/server/api.ts` server functions `getMe`/`getPlugins`/`getSystemStatus`/
      `getIotEntities`: read the session cookie, fetch `core-api` over the internal network
      forwarding it, return typed data (`@pcc/contracts`); `getMe` 401 → `null`; data fns 401 →
      `throw redirect()` to login. Tests mock the `core-api` fetch.
- [ ] 3.2 `_authenticated` pathless layout route: `beforeLoad` → `getMe()` → router context `me`;
      `null` → `redirect()` to `/api/auth/login?returnTo=<path>`. Root route uses
      `createRootRouteWithContext<{ me }>()`.
- [ ] 3.3 Convert dashboard/index, system tile, iot-summary tile, and `/devices` to **route loaders**
      that call the server functions (SSR renders with data); nav identity chip reads `me` from
      router context.
- [ ] 3.4 Remove `lib/api.ts` (browser client), the `AuthProvider` `/me` probe (replace `useAuth`
      with router-context access), and `routes/api/$.ts`. Keep `forbidden.tsx`; point `login()`/
      `logout()` helpers at `/api/auth/*` on `app.`.
- [ ] 3.5 `pnpm --filter web generate-routes`; FE gates green: `nx affected -t typecheck lint test
      build` + `prettier --check`.

## 4. E2E verification + done gate

- [ ] 4.1 `docker compose up -d --build` → `app.`/`keycloak.`/`core-api`(internal)/`postgres`/`ha`
      healthy; realm imports; **assert `api.pcc.localhost` is NOT publicly routable** (curl `app.`
      ok; `Host: api.pcc.localhost` → 404 via Traefik).
- [ ] 4.2 Rewrite `tests/e2e/auth.spec.ts` for app-only ingress: browser hits only `app.pcc.localhost`;
      login `testuser/Test123!`; **assert the dashboard is server-rendered with data** (tiles
      populated, not "Loading…"); `/me` via `app.`; **revocation** (logout → reuse cookie → 401/redirect).
- [ ] 4.3 Full gates green: .NET trio (unchanged — still 46 green) + FE typecheck/lint/test/build/
      prettier + the E2E.
- [ ] 4.4 Update `CLAUDE.md` (SSR-BFF ingress; `api.` internal; server functions; cookie re-homing).
      Mark tasks complete; ready for `/opsx:archive`.
