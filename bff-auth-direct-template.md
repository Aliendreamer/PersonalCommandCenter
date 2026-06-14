# Cookie-Auth Template — Direct BFF (browser ↔ .NET API)

A complete, reusable build playbook to recreate the **TanStack Start (FE) + .NET
FastEndpoints (BE) + Keycloak** server-owned-session auth stack with a Postgres
session store (instant revocation) and a dockerized `*.localhost` harness. Here the
**.NET API is itself the BFF**: the browser holds the session cookie and calls the
API **directly** at `api.<slug>.localhost`.

Paste this whole file into a fresh Claude session. It is the spec **and** the
recipe — follow it top to bottom.

> **Two templates — pick one.** This is the **Direct BFF** variant. Its sibling
> `bff-auth-ssr-template.md` builds the **SSR BFF** variant (the TanStack SSR server
> is the BFF; the API is internal-only; the browser only ever sees `app.`).

| | **Direct BFF (this file)** | **SSR BFF (`bff-auth-ssr-template.md`)** |
|---|---|---|
| Public surface | `app.` **and** `api.` | only `app.` (+ `keycloak.`) |
| Who calls the API | the **browser**, directly | the SSR server, server-to-server |
| Auth gate | client `AuthProvider` probing `/me` | `_authenticated` `beforeLoad` (server-side `getMe`) |
| Page data | client TanStack Query after the gate | SSR loaders → server functions (renders **with data**) |
| API exposure | published behind Traefik (`api.`) | **internal-only** (`<be-service>:8080`) |
| Cookie | shared parent domain, sent cross-subdomain | app host-only, re-homed by the SSR proxy |
| Pick when | the API must be independently reachable (mobile, 3rd-party); simpler FE server | you want one origin, no API host/token in the client, SSR-with-data, smaller attack surface |

Both keep **.NET as the sole token owner** with a revocable Postgres session — they
differ only in *where the BFF lives* and *who holds the cookie*. The **BE is ~95%
identical** between the two.

---

## How Claude must work on this

- **Ask me for two things first** (STEP 0), then build everything.
- **Use Serena** for ALL code search/reading/editing (`get_symbols_overview`,
  `find_symbol`, `read_file`, `list_dir`, symbol edits) — never raw grep/sed/cat
  for code.
- **Use OpenSpec** if the repos use it: `/opsx:propose` → `/opsx:apply` →
  `openspec validate <name> --strict` → archive. Otherwise implement directly.
- Conventional commits, **lowercase subject** (commitlint `subject-case`). Don't
  push or open PRs unless asked.
- Verify with real builds/tests + an end-to-end harness run before claiming done.

## STEP 0 — ask, then stop and wait

Ask me for **exactly these two values and nothing else**:

1. **BE project name** → use as the .NET project + root namespace `<BeName>` (PascalCase).
2. **FE project name** → use as the pnpm package `<fe-name>` (kebab-case).

Then derive a lowercase alphanumeric **`<slug>`** (e.g. a shared product name,
drop `_BE`/`_FE`). Local hosts:

```
parent (registrable domain):  <slug>.localhost
FE:        app.<slug>.localhost
API:       api.<slug>.localhost
Keycloak:  keycloak.<slug>.localhost
realm:     <Realm>           client (confidential): <slug>_api
```

---

## Outcome (what exists when done)

- Unauthenticated visit to `app.<slug>.localhost` → styled page, "Log in".
- Click Log in → Keycloak → back on the app showing **"Hello, &lt;user&gt;"** + roles.
- `GET api/me` returns `{id, subject, email, roles[]}` from the cookie session.
- Logout **revokes the session server-side** → reusing the old cookie → `401`.
- Tokens never reach JS; the cookie holds only an opaque session id.

---

## Architecture — Direct BFF (the organizing rule)

> **Whoever exchanges the Keycloak `code` holds the tokens. Pick exactly one
> owner. Here it is the .NET API, which the browser calls directly.**

```
Browser ──HttpOnly opaque cookie (auto)──►  .NET API  ──server-to-server──► Keycloak
   (app.<slug>)                              (api.<slug>)    (exchange + refresh)
        │                                        │
        └── GET /api/me  ◄───────────────────────┘   (auth state + roles)
  + no FE-server hop   + token never in JS   + same-site cookie rides app.→api.
```

The FE server is **never** a hop for data. FE and API share the **registrable
parent domain** (`<slug>.localhost`), so the cookie is **same-site** and is sent
on direct browser→API calls under `SameSite=Lax`.

## Stack (pin exact versions)

- **FE**: TanStack Start (SSR) + TanStack Router (file-based) + TypeScript strict +
  Tailwind v4 + TanStack Query + native `fetch` (no axios) + (optional) react-i18next + TanStack Store.
  Vitest + RTL. pnpm, `save-exact`.
- **BE**: .NET (latest LTS) + FastEndpoints + EF Core (Npgsql) + Serilog +
  `Microsoft.AspNetCore.Authentication.JwtBearer` + FusionCache. xUnit + Moq +
  EF InMemory; treat-warnings-as-errors; ~90% coverage gate. All routes under `api/`.
- **Infra**: PostgreSQL + Keycloak + Traefik + Docker Compose.

---

## Exact dependencies & key config (pin these; bump to current at build time)

These are the full manifests of the reference repos. Reproduce them verbatim
(re-pin to the latest compatible versions when building fresh; keep the *set*).

### FE — `package.json`
```jsonc
{
  "name": "<fe-name>", "private": true, "type": "module",
  "engines": { "node": ">=24" }, "packageManager": "pnpm@11.5.2",
  "imports": { "#/*": "./src/*" },
  "scripts": {
    "dev": "vite dev --port 3000", "generate-routes": "tsr generate",
    "build": "vite build", "start": "node .output/server/index.mjs",
    "preview": "vite preview", "test": "vitest run", "test:watch": "vitest",
    "typecheck": "tsc --noEmit", "lint": "eslint",
    "format": "prettier --write . && eslint --fix", "check": "prettier --check .",
    "prepare": "husky"
  },
  "dependencies": {
    "@tailwindcss/vite": "4.3.0", "tailwindcss": "4.3.0",
    "@tanstack/react-start": "1.168.25", "@tanstack/react-router": "1.170.15",
    "@tanstack/react-router-ssr-query": "1.167.1", "@tanstack/router-plugin": "1.168.18",
    "@tanstack/react-query": "5.101.0", "@tanstack/react-query-devtools": "5.101.0",
    "@tanstack/react-form": "1.33.0",
    "@tanstack/react-store": "0.11.0", "@tanstack/store": "0.11.0",
    "@tanstack/react-devtools": "0.10.5", "@tanstack/react-router-devtools": "1.167.0",
    "i18next": "26.3.1", "i18next-browser-languagedetector": "8.2.1", "react-i18next": "17.0.8",
    "lucide-react": "1.17.0", "react": "19.2.7", "react-dom": "19.2.7"
  },
  "devDependencies": {
    "@commitlint/cli": "21.0.2", "@commitlint/config-conventional": "21.0.2",
    "@tailwindcss/typography": "0.5.20",
    "@tanstack/devtools-event-client": "0.4.3", "@tanstack/devtools-vite": "0.7.0",
    "@tanstack/eslint-config": "0.4.0", "@tanstack/nitro-v2-vite-plugin": "1.155.0",
    "@tanstack/router-cli": "1.167.17",
    "@testing-library/dom": "10.4.1", "@testing-library/react": "16.3.2",
    "@types/node": "25.9.2", "@types/react": "19.2.17", "@types/react-dom": "19.2.3",
    "@vitejs/plugin-react": "6.0.2", "cspell": "10.0.1", "eslint": "10.4.1",
    "husky": "9.1.7", "jsdom": "29.1.1", "lint-staged": "17.0.7",
    "prettier": "3.8.4", "typescript": "6.0.3", "vite": "8.0.16", "vitest": "4.1.8"
  }
}
```
- `.npmrc`: `save-exact=true` + empty `save-prefix=` (exact pins, no `^`).
- `pnpm-workspace.yaml`: `minimumReleaseAge: 10080` (7-day supply-chain cooldown),
  `verifyDepsBeforeRun: false`, `strictDepBuilds: false`,
  `onlyBuiltDependencies: [esbuild, lightningcss, unrs-resolver, '@parcel/watcher']`.
  (The Dockerfile sets `minimumReleaseAge: 0` for its own vetted frozen install.)
- `vite.config.ts` plugins order: `devtools()`, `tailwindcss()`, `tanstackStart()`,
  `nitroV2Plugin({ preset: 'node-server' })`, `viteReact()`; `resolve.tsconfigPaths: true`.
- Path alias `@/* → src/*` (tsconfig). Tooling: ESLint (`@tanstack/eslint-config`),
  Prettier, cspell, husky + lint-staged + commitlint (conventional, lowercase subject).

### BE — `<BeName>.csproj` (`Microsoft.NET.Sdk.Web`, `net10.0`)
PropertyGroups: `Nullable=enable`, `ImplicitUsings=enable`, `RootNamespace=<BeName>`,
`EnableNETAnalyzers=true`, `AnalysisLevel=latest-recommended`, `AnalysisMode=All`,
`TreatWarningsAsErrors=true`, `NoWarn=CA1812,CA1848,CA1707,CA1861`,
`<Compile Remove="<BeName>.Tests/**/*.cs" />`. PackageReferences:
```xml
<PackageReference Include="FastEndpoints" Version="8.1.0" />
<PackageReference Include="FastEndpoints.Swagger" Version="8.1.0" />
<PackageReference Include="FastEndpoints.HealthChecks" Version="8.1.0" />
<PackageReference Include="Scalar.AspNetCore" Version="2.14.14" />
<PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="10.0.8" />
<PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="10.0.2" />
<PackageReference Include="Microsoft.EntityFrameworkCore" Version="10.0.8" />
<PackageReference Include="Microsoft.EntityFrameworkCore.Relational" Version="10.0.8" />
<PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="10.0.8" />
<PackageReference Include="Microsoft.EntityFrameworkCore.Tools" Version="10.0.8" />
<PackageReference Include="ZiggyCreatures.FusionCache" Version="2.6.0" />
<PackageReference Include="Serilog.AspNetCore" Version="10.0.0" />
<PackageReference Include="Serilog.Settings.Configuration" Version="10.0.0" />
<PackageReference Include="Serilog.Expressions" Version="5.0.0" />
<PackageReference Include="Serilog.Sinks.Console" Version="6.1.1" />
<PackageReference Include="Serilog.Sinks.File" Version="7.0.0" />
<PackageReference Include="Serilog.Formatting.Compact" Version="3.0.0" />
<PackageReference Include="NetEscapades.AspNetCore.SecurityHeaders" Version="1.3.1" />
<PackageReference Include="AspNetCore.HealthChecks.NpgSql" Version="9.0.0" />
<PackageReference Include="Bogus" Version="35.6.5" />
```
Note: don't reference `Microsoft.Extensions.*.Abstractions` (in the .NET 10 shared
framework → `NU1510`). `FluentValidation` ships with FastEndpoints.

### BE — `<BeName>.Tests.csproj` (`Microsoft.NET.Sdk`, `net10.0`, `IsPackable=false`)
```xml
<PackageReference Include="Microsoft.NET.Test.Sdk" Version="18.6.0" />
<PackageReference Include="xunit" Version="2.9.3" />
<PackageReference Include="xunit.runner.visualstudio" Version="3.1.5" /> <!-- PrivateAssets=all -->
<PackageReference Include="Moq" Version="4.20.72" />
<PackageReference Include="Microsoft.EntityFrameworkCore.InMemory" Version="10.0.8" />
<PackageReference Include="FluentValidation" Version="12.1.1" />
<PackageReference Include="coverlet.collector" Version="10.0.1" /> <!-- PrivateAssets=all -->
<PackageReference Include="Microsoft.AspNetCore.Http.Features" Version="5.0.17" />
<!-- ProjectReference: ../<BeName>.csproj -->
```
Solution: `<BeName>.slnx`. Build: `dotnet build <BeName>.csproj`. Migrations:
`./build_migration.sh "Name"` (needs the `dotnet-ef` 10.x global tool). Tests +
coverage: `./build_test.sh` (~90% line gate via `coverage.runsettings`). Style:
`.editorconfig` is the single source of truth (4-space, Allman braces, file-scoped
namespaces, explicit types, PascalCase/_camelCase, global usings in `globals.cs`).

---

## BE — components to build (`<BeName>`)

Startup (`Program.cs`): `ConfigureBuilder → AddSharedConfiguration → AddDatabaseContext
→ AddCommonServices → AddEndpoints → build → UseRequestPipeline → MigrateAndSeedDbAsync → run`.

### Composition root — `Extensions/`
- **BuilderExtension** `AddCommonServices`:
  - `AddAuthentication(JwtBearer).AddJwtBearer(...)` — `Authority`/`Audience` from
    `Keycloak` config, `RequireHttpsMetadata = !Development`, `NameClaimType=sub`,
    `RoleClaimType=ClaimTypes.Role`, **`ValidateAudience` only when an audience is set**.
  - **`options.Events = new JwtBearerEvents { OnMessageReceived = CookieBearerTokenResolver.OnMessageReceivedAsync }`**.
  - `IClaimsTransformation` = `KeycloakRolesClaimsTransformation`; scoped `CurrentUser`/`ICurrentUser`.
  - `AddFusionCache()` (sub→User.Id, L1; Redis L2 later).
  - CORS policy: `WithOrigins(<exact FE origin>).AllowAnyHeader().AllowAnyMethod().AllowCredentials()` (NEVER `*` with credentials).
  - Bind options: `Configure<KeycloakOptions>`, `Configure<SessionCookieOptions>`, `Configure<SessionStoreOptions>`.
  - Named `HttpClient` for Keycloak; register `SessionCleanupService` (hosted).
  - Convention auto-register `XxxService : BaseService, IXxxService`.
- **ApplicationExtensions** `UseRequestPipeline`: forwarded headers, security headers,
  exception handler, Serilog request logging, rate limiter, `UseCors`,
  `UseAuthentication`/`UseAuthorization`, FastEndpoints (RoutePrefix `api`, global
  `RequireCors` + `UserProvisioningPreProcessor`), Swagger/Scalar. `MigrateAndSeedDbAsync` applies EF migrations on startup.
- **FastEndpointSetup**: `AddFastEndpoints()` + health checks + Swagger.

### Auth flow — `WebApi/Auth/` (group `Groups/AuthGroup.cs`, sub-prefix `auth/`)
All `AllowAnonymous()` except `/me`. Endpoints are thin (`[ExcludeFromCodeCoverage]`)
over tested helpers.
- **Login/LoginEndpoint** `GET api/auth/login?returnTo=`:
  `ReturnToSanitizer.Sanitize` → `Pkce.Create()` (verifier+challenge S256 + nonce)
  → set short-lived HttpOnly **PKCE cookie** `"<nonce>.<verifier>"` →
  `OidcStateCodec.Encode({nonce, returnTo})` → `IKeycloakOidcClient.BuildAuthorizeUrlAsync` → 302.
- **Callback/CallbackEndpoint** `GET api/auth/callback?code&state`:
  read+clear PKCE cookie; `OidcStateCodec.TryDecode`; verify `state.Nonce == cookieNonce`;
  `ExchangeCodeAsync(code, verifier)`; extract `sub` via `JwtSubjectReader`; compute
  expiries; **`ISessionStore.CreateAsync` → rawToken**; `SetSession(mp_sid)`;
  **302 to the ABSOLUTE `{KeycloakOptions.AppBaseUrl}{returnTo}`** (`allowRemoteRedirects: true`).
- **Logout/LogoutEndpoint** `GET api/auth/logout`:
  read `mp_sid` → capture refresh token from the session → **`ISessionStore.RevokeAsync`**
  → `ClearSession` → 302 `BuildEndSessionUrlAsync` → app post-logout URL.
- Helpers: `Pkce`, `OidcState`+`OidcStateCodec`, `ReturnToSanitizer` (relative path
  starting with a single `/`; reject `//`/scheme), `SessionToken` (256-bit base64url
  + SHA-256 hash — store hash only), `JwtSubjectReader` (pure `sub` from JWT payload),
  `KeycloakOptions`, `SessionCookieOptions`, `SessionStoreOptions`.

### Token resolution — `WebApi/Auth/CookieBearerTokenResolver.cs`
`ResolveTokenAsync(request, response, cookies, store, oidc, ct)` (testable core):
1. `Authorization` header present → return null (header bearer path preserved).
2. read `mp_sid` → `store.GetValidAsync` → none → null.
3. access token unexpired (small leeway) → return it.
4. expired + refresh valid → `oidc.RefreshAsync` → `store.UpdateTokensAsync` → return new token.
5. else → null (→ 401).

### Identity — `WebApi/Me/`
`MeEndpoint` `GET api/me` `[Authorize]` → `MeResponseFactory` builds `MeResponse
{id, subject, email, roles[]}` from `ICurrentUser`; `Cache-Control: no-store`; 401 when anon.

### Keycloak-consumer plumbing — `WebApi/Authentication/`
`KeycloakRolesClaimsTransformation` (flatten `realm_access.roles` → role claims,
idempotent); `UserProvisioningPreProcessor` (global, JIT-provision local `User` by
`sub`, populate `ICurrentUser`); `CurrentUser`/`ICurrentUser`.

### Data — `Data/`
- `ProjectDbContext` (`Users`, `UserSessions` DbSets; `UseIdentityAlwaysColumns`;
  `ApplyConfigurationsFromAssembly`). `ProjectDbContextFactory` (design-time).
- `Models/AuditableEntity` (CreatedAt/UpdatedAt/Version via `AuditInterceptor`),
  `Models/User` (`Id`, unique `Sub`, `Email?`, `FullName?`),
  `Models/UserSession` (`Id`, unique `TokenHash`, indexed `Subject`, `AccessToken`,
  `RefreshToken?`, `AccessTokenExpiresAt`, `RefreshTokenExpiresAt?`, `RevokedAt?`).
- `ModelConfigurations/UserConfiguration`, `UserSessionConfiguration` (token cols `text`).
- `Migrations/` — `AddUsers` + `AddUserSessions` (generate via `./build_migration.sh "Name"`).
- `Auth/KeycloakOidcClient` + `IKeycloakOidcClient` + `OidcDiscoveryDocument`
  (discovery from `Authority`; `BuildAuthorizeUrlAsync`, `ExchangeCodeAsync`,
  `RefreshAsync`, `BuildEndSessionUrlAsync`). `SeedData` (placeholder).

### Services — `Services/`
`BaseService` (Context/Logger/paging) + `IService`; `UserProvisioningService`
(FusionCache `sub→Id`, race-safe upsert); **`SessionStore : BaseService, ISessionStore`**
(`CreateAsync/GetValidAsync/UpdateTokensAsync/RevokeAsync/RevokeAllForSubjectAsync`,
hash via `SessionToken`, exclude revoked/expired); `SessionCleanupService`
(`BackgroundService`, periodic purge of revoked/expired, scoped DbContext, interval from config).

### Cookies & config
- Cookies (`mp_sid`, `mp_pkce`): `HttpOnly`, `SameSite=Lax`, `Path=/`,
  `Domain=.<slug>.localhost`, `Secure` only outside Development.
- `Utils/Constants.cs`: `RoutePrefix="api"`, CORS/cookie/route/table constants, `Roles.Admin/User`.
- `Config/appsettings*.json`: `Keycloak` (`Authority`, `Audience`, `ClientId`,
  `ClientSecret`, `CallbackUri`, `PostLogoutRedirectUri`, `AppBaseUrl`),
  `SessionCookies` (`Domain`, `SessionName`, `PkceName`), `SessionStore`
  (`CleanupInterval`), `AllowedCorsOrigins`, `ConnectionStrings:Postgres`.

---

## FE — components to build (`<fe-name>`)

```
src/
  router.tsx, routeTree.gen.ts (generated), styles.css, env.d.ts
  routes/  __root.tsx  _public.tsx  _public.index.tsx  login.tsx
           admin.tsx  admin.index.tsx  forbidden.tsx
  lib/api/client.ts
  lib/auth/{me.ts, endpoints.ts, AuthProvider.tsx, guard.ts, config.ts}
  lib/i18n/* (optional)   lib/utils/cn.ts
  components/ui/{Button,Card,Input,Spinner}.tsx   components/layout/*
  integrations/tanstack-query/*   stores/uiStore.ts (optional)
```

- **`lib/api/client.ts`**: a native-`fetch` wrapper `apiFetch<T>(path, options)` —
  `fetch(`${VITE_API_URL}${path}`, { credentials: 'include', headers: {'Content-Type':'application/json'} })`,
  no `Authorization` header, no client refresh. Parses JSON, throws an `ApiError`
  on non-2xx. On `401` (except a `skipAuthRedirect` flag used by the `/me` probe) →
  `window.location.assign` to the API login, preserving the path. No axios.
- **`lib/auth/me.ts`**: typed `Me {id, name?, email?, roles}` + `normalizeMe` +
  `fetchMe` (`GET /me`, credentialed, `skipAuthRedirect`) + `meQueryOptions`
  (TanStack Query, `staleTime`, `retry:false`) + `ensureMe(queryClient)` for `beforeLoad`.
- **`lib/auth/endpoints.ts`**: `buildLoginUrl(returnTo)` =
  `${VITE_API_URL}/auth/login?returnTo=…`, `buildLogoutUrl()`, `login()/logout()`
  (full-page `window.location.assign`).
- **`lib/auth/AuthProvider.tsx`**: derive `isAuthenticated`/identity/roles from
  `meQuery` (client-only via `enabled`; SSR shows loading). No `oidc-client-ts`, no `localStorage`.
- **`lib/auth/guard.ts`**: `requireAuth`/`requireRole`/`requireAdmin(queryClient)`
  using `ensureMe` → redirect `/login` (401) or `/forbidden` (authed non-admin).
- **`lib/auth/config.ts`**: `ADMIN_ROLE`.
- **Routes**: `__root.tsx` wires `AuthProvider`, `head.links=[{rel:'stylesheet',href:appCss}]`
  (`import appCss from '../styles.css?url'`). `_public.index.tsx` (home) = **"Hello,
  {name|email}"** + roles + Logout when authed, "Log in" when not, loading skeleton
  while pending. `login.tsx` calls `endpoints.login`. `admin.tsx` (`ssr:false`,
  `beforeLoad` guard) + `admin.index.tsx` = minimal protected page. `forbidden.tsx`.
  **No `/auth/callback` route** (the API owns it). Run `pnpm generate-routes` after route changes.
- **`styles.css`** (Tailwind v4): `@import 'tailwindcss' source(none);` then
  `@source './';` (see gotcha #6). Neutral theme — no product branding.
- **Env**: `.env`/`.env.dev` → `VITE_API_URL=http://api.<slug>.localhost/api`;
  `.env.prod` → real `https://api.<domain>/api`. `env.d.ts` declares only `VITE_API_URL`.
- **Dockerfile**: multi-stage; `ARG VITE_API_URL` (Vite inlines at build) default
  `http://api.<slug>.localhost/api`; runtime runs `.output/server/index.mjs`.
  `.dockerignore` excludes `.output`, `.nitro`, `.tanstack`, `node_modules`, `.git`, `.env*`.

---

## Harness — `docker-compose.yml` (in the BE repo) + `harness/keycloak/<Realm>-realm.json`

Five services; **only Traefik publishes a port**:

- `proxy` (Traefik v3): `ports: ["80:80"]`, `--providers.docker`, mount docker.sock
  ro; network alias `keycloak.<slug>.localhost`.
- `postgres` (17-alpine): healthcheck.
- `keycloak` (26): `start-dev --import-realm`; `KC_HOSTNAME=http://keycloak.<slug>.localhost`,
  `KC_HOSTNAME_STRICT=false`, `KC_HTTP_ENABLED=true`, `KC_PROXY_HEADERS=xforwarded`;
  mount `./harness/keycloak`; Traefik label `Host(keycloak.<slug>.localhost)` → :8080.
- `api` (build `.`): env Authority `http://keycloak.<slug>.localhost/realms/<Realm>`,
  ClientId `<slug>_api`, secret, CallbackUri `http://api.<slug>.localhost/api/auth/callback`,
  AppBaseUrl/PostLogout `http://app.<slug>.localhost`, `SessionCookies__Domain=.<slug>.localhost`,
  `AllowedCorsOrigins__0=http://app.<slug>.localhost`, Postgres conn;
  **`extra_hosts: ["keycloak.<slug>.localhost:host-gateway"]`**; Traefik `Host(api.<slug>.localhost)` → :8080.
- `fe` (build `../<fe-dir>`, arg `VITE_API_URL=http://api.<slug>.localhost/api`);
  Traefik `Host(app.<slug>.localhost)` → :3000.

Realm import JSON: realm `<Realm>`; roles `Admin`,`User`; **confidential** client
`<slug>_api` (`publicClient:false`, secret, `redirectUris:[http://api.<slug>.localhost/api/auth/callback]`,
`attributes.post.logout.redirect.uris` `##`-separated, `pkce.code.challenge.method:S256`);
test user `testuser`/`Test123!` with realm roles `Admin`,`User`. `HARNESS.md` documents URLs + gotchas.

---

## CRITICAL gotchas (each cost real debugging — bake them in)

1. **`VITE_API_URL` MUST include `/api`** — the BE prefixes every route with `api/`.
   Use `http://api.<slug>.localhost/api`. Else login/`/me` 404.
2. **Callback redirects to the ABSOLUTE app URL** `{AppBaseUrl}{returnTo}`, not the
   relative `returnTo` (callback runs on the api host → relative lands on api). Keep
   `returnTo` sanitized → no open redirect.
3. **Keycloak issuer must match from BOTH browser and api container** or `iss`
   validation 401s. `KC_HOSTNAME=http://keycloak.<slug>.localhost` + the api
   `extra_hosts: ["keycloak.<slug>.localhost:host-gateway"]` so the same URL resolves inside.
4. **Realm import**: post-logout redirects go in the client `attributes` as
   `post.logout.redirect.uris` (`##`-separated). A top-level `postLogoutRedirectUris`
   is rejected by Keycloak 26 → import aborts → discovery 404 → login 500.
5. **BE Dockerfile**: `dotnet publish <BeName>.csproj` explicitly — NOT the solution
   (publishing `.slnx`/`.sln` drags in the test project and fails analyzer restore).
6. **Tailwind v4 SSR/client CSS hash mismatch**: `@import 'tailwindcss' source(none);`
   + `@source './';`. Auto-detection respects `.gitignore`, which `.dockerignore`
   strips, so Tailwind otherwise scans `.output/` and the SSR vs client passes emit
   different CSS hashes → stylesheet 404 → unstyled page. Also exclude `.output`/`.nitro`/`.tanstack` in `.dockerignore`.
7. **Secure cookies on localhost**: cross-subdomain is same-site → `SameSite=Lax`
   needs no `Secure`, so plain `http://*.localhost` works; keep `Secure` off in Dev only.
8. **Resolution**: browsers auto-resolve `*.localhost`→127.0.0.1 (RFC 6761) — **no
   `/etc/hosts`, no DNS, no host changes**. For `curl` use `--resolve <host>:80:127.0.0.1`
   (curl won't auto-resolve, and it drops Keycloak's `Secure; SameSite=None` login
   cookies over HTTP — a real browser accepts them on localhost; to script the full
   login in curl you must thread cookies manually).
9. **Same registrable domain is load-bearing**: `app.` and `api.` must share
   `<slug>.localhost` (eTLD+1) so the cookie is same-site. In prod, FE and API must
   likewise share a real parent domain (e.g. `app.`/`api.` of one domain), else you
   need `SameSite=None` + HTTPS and lose this CSRF posture.

---

## Verify before claiming done

- BE: `dotnet build <BeName>.csproj` warning-clean; `./build_test.sh` green
  (cover the store, token hashing, returnTo sanitizer, PKCE/state codec, cookie
  resolver, `/me`/guard). FE: `pnpm generate-routes`, `typecheck`+`lint`+`test`+`build` clean.
- `docker compose up --build` → 5 services healthy, realm imports.
- End-to-end (browser, or scripted with `--resolve` + manual cookie threading):
  1. `app.<slug>.localhost` loads **styled**, logged-out, "Log in".
  2. Log in (`testuser`/`Test123!`) → home shows **"Hello, …"** + roles.
  3. `GET /api/me` with cookie → `200`; without → `401`.
  4. **Revocation**: capture `mp_sid`; logout; reuse old `mp_sid` → `GET /api/me` → **401**.

## Suggested build order

1. (If OpenSpec) propose specs for both repos. 2. BE: data+migration → session store →
auth wiring (`OnMessageReceived`) → endpoints (login/callback/logout) → `/me` → cleanup.
3. FE: client → `/me`+AuthProvider+guards → home/login/logout. 4. Harness compose +
realm import. 5. Verify end-to-end incl. revocation.
