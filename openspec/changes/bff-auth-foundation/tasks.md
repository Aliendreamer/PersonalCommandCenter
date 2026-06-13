## 1. FastEndpoints migration (behavior identical; gates green before Phase 2)

- [x] 1.1 Add FastEndpoints (+ Swagger + HealthChecks) to `core-api`; register
      `AddFastEndpoints(o => o.Assemblies = pluginAssemblies)` (core-api + plugin assemblies);
      `UseFastEndpoints(c => c.Endpoints.RoutePrefix = "api")`; keep Scalar at `/scalar`.
- [x] 1.2 Change `IPlugin` in `libs/plugin-abstractions`: remove `MapEndpoints`; keep `Id`,
      `Manifest`, `Configure`. Update `PluginRegistry` to stop calling `MapEndpoints`.
- [x] 1.3 (TDD) Adapt `PluginsEndpointTests`; implement `PluginsEndpoint` (FastEndpoints) for
      `GET api/plugins` returning enabled-plugin manifests (behavior identical).
- [x] 1.4 (TDD) Rewrite system status as `SystemStatusEndpoint` (FastEndpoints, group `system/`);
      adapt `SystemStatusTests`.
- [x] 1.5 (TDD) Rewrite iot entities as `GetIotEntitiesEndpoint` (FastEndpoints, group `iot/`),
      keeping the HA client + 502-degraded; adapt `IotEndpointTests`.
- [x] 1.6 Remove dead minimal-API mapping code; confirm health endpoint is anonymous.
- [x] 1.7 .NET gates green: `dotnet build -warnaserror`, `dotnet format --verify-no-changes`,
      `dotnet test`.

## 2. Substrate cutover (Traefik + Keycloak + Postgres; everything behind Traefik)

- [ ] 2.1 Add `traefik` (v3) service: `ports: ["80:80"]`, docker provider, mount docker.sock ro,
      enable file provider (dynamic config dir).
- [ ] 2.2 Add `postgres` (17-alpine) service (healthcheck, internal only).
- [ ] 2.3 Add `keycloak` (26) service: `start-dev --import-realm`, mount `./harness/keycloak`,
      `KC_HOSTNAME=http://keycloak.pcc.localhost`, `KC_HOSTNAME_STRICT=false`, `KC_HTTP_ENABLED=true`,
      `KC_PROXY_HEADERS=xforwarded`; Traefik label `Host(keycloak.pcc.localhost)` → :8080.
- [ ] 2.4 Create `harness/keycloak/Pcc-realm.json`: realm `Pcc`; roles `Admin`/`User`; confidential
      client `pcc_api` (`publicClient:false`, secret, redirect `…/api/auth/callback`, post-logout in
      client `attributes` `##`-separated, `pkce S256`); seed user `testuser/Test123!` with both roles.
- [ ] 2.5 Add Traefik labels to `core-api` (`api.pcc.localhost`→:8080), `web`
      (`app.pcc.localhost`→:3000), `home-assistant` (`ha.pcc.localhost`→:8123); add api
      `extra_hosts: ["keycloak.pcc.localhost:host-gateway"]`; **drop the direct `:5080/:3000/:8123`
      host ports**.
- [ ] 2.6 Add a Traefik file-provider dynamic config routing `portainer.pcc.localhost` → the existing
      standalone Portainer (do not add/rebuild a Portainer service).
- [ ] 2.7 `.env`/`.env.example`: Keycloak client secret, Postgres connection, `AppBaseUrl`, cookie
      domain `.pcc.localhost`, CORS origin `http://app.pcc.localhost`; web build arg
      `VITE_API_URL=http://api.pcc.localhost/api`.
- [ ] 2.8 `docker compose up -d --build` → traefik/keycloak/postgres/core-api/web/ha healthy; realm
      imports; `app.pcc.localhost` + `keycloak.pcc.localhost` reachable through Traefik.

## 3. Auth backend (TDD; consolidated services per design)

- [x] 3.1 Add deps: EF Core + Npgsql, `Microsoft.AspNetCore.Authentication.JwtBearer`, FusionCache,
      Serilog, security headers.
- [x] 3.2 (TDD) `OidcProtocol` unit tests (PKCE S256, state round-trip + tamper-reject, `returnTo`
      sanitize cases, session-token gen + **hash-only**, JWT `sub` read) → implement `OidcProtocol`.
- [x] 3.3 `PccDbContext` + `User`/`UserSession` (+ `AuditableEntity`) configured inline in
      `OnModelCreating`; migrations `AddUsers`/`AddUserSessions`; design-time factory; EF migrate on
      startup.
- [x] 3.4 (TDD) `SessionService` tests (EF InMemory + Moq `KeycloakClient`): create→persist hash,
      resolve unexpired, refresh-on-expiry, **revoke→resolve null**, purge → implement
      `SessionService : ISessionService`.
- [x] 3.5 (TDD) `KeycloakClient` tests (authorize-URL shape; exchange/refresh request shape via stub
      `HttpMessageHandler`) → implement `KeycloakClient : IKeycloakClient` + discovery.
- [x] 3.6 (TDD) `CurrentUser` tests (JIT upsert by `sub`, cached, roles from `realm_access`) →
      implement `CurrentUser : ICurrentUser` (FusionCache `sub→id`).
- [x] 3.7 Composition root: `AddAuthentication(JwtBearer)` + `CookieJwtBearerEvents.OnMessageReceived`
      → `SessionService`; bind `AuthOptions` (`Keycloak`/`Cookies`/`Store`); CORS (exact app origin +
      `AllowCredentials`); `CurrentUserPreProcessor` (global); `SessionCleanupHostedService`; named
      Keycloak `HttpClient`; security headers + Serilog request logging.
- [x] 3.8 (TDD) Auth endpoints + integration tests: `Login` (`GET api/auth/login` → 302 + `mp_pkce`),
      `Callback` (stubbed Keycloak token endpoint → `mp_sid` + 302 to `{AppBaseUrl}{returnTo}`),
      `Logout` (revoke + clear), `Me` (`GET api/me` → 200 authed / 401 anon); revocation test
      (login → capture `mp_sid` → logout → reuse → 401).
- [ ] 3.9 (TDD) Gate all non-auth endpoints (default authorization); keep health anonymous; update
      `PluginsEndpointTests`/`SystemStatusTests`/`IotEndpointTests` for 401-anon / 200-authed (iot 502
      when HA down, authed).
- [x] 3.10 .NET gates green (build `-warnaserror` · format · test, incl. new auth tests + migrations).

## 4. Frontend (TDD; whole app behind login)

- [ ] 4.1 Remove the FE→API server proxy (`routes/api/$.ts`) and the SSR `API_URL` hop; set
      `VITE_API_URL=http://api.pcc.localhost/api`.
- [ ] 4.2 (TDD) Extend `lib/api.ts`: `credentials:'include'`, `ApiError` on non-2xx, `401` (except a
      `skipAuthRedirect` flag) → full-page redirect to `api/auth/login?returnTo=<path>` → tests.
- [ ] 4.3 (TDD) `lib/auth/auth-api.ts`: `Me` + `fetchMe` + `meQueryOptions` (client-only,
      `retry:false`) + `ensureMe` + `login(returnTo)`/`logout()` + `requireAuth`/`requireRole` +
      `ADMIN_ROLE` → tests.
- [ ] 4.4 `lib/auth/AuthProvider.tsx` (context + `useAuth`) → test.
- [ ] 4.5 (TDD) Authed-layout route wrapping app routes (`beforeLoad` → `ensureMe` → 401 redirect);
      `plugin-shell` fetches `/api/plugins` after auth; adapt `plugin-shell.test`.
- [ ] 4.6 (TDD) Nav identity/logout chip (`{name} · roles · Logout`) + `forbidden.tsx` → tests.
- [ ] 4.7 `pnpm --filter web generate-routes`; FE gates green: `nx affected -t typecheck lint test
      build` + `prettier --check`.

## 5. E2E verification + done gate

- [ ] 5.1 `docker compose up -d --build` → traefik/keycloak/postgres/core-api/web/ha healthy; realm
      imports; `portainer.pcc.localhost` route resolves to the standalone instance.
- [ ] 5.2 Playwright E2E: `app.pcc.localhost` logged-out → login `testuser/Test123!` → dashboard
      renders (system + iot tiles) → `GET api/me` 200 with cookie, 401 without → **revocation**
      (logout → reuse cookie → 401).
- [ ] 5.3 Re-verify the IoT path behind auth on `api.pcc.localhost` (entities load; 502-degraded when
      HA down).
- [ ] 5.4 Full gates green: .NET (build `-warnaserror` · format · test) + FE (typecheck · lint · test
      · build · prettier); update `CLAUDE.md` (auth substrate, `*.pcc.localhost`, FastEndpoints,
      Keycloak/Postgres).
- [ ] 5.5 Mark all tasks complete; ready for `/opsx:archive`.
