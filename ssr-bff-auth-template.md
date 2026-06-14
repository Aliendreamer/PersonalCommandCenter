# SSR-BFF Cookie-Auth — full build template (World A)

A complete, reusable build playbook to recreate the **TanStack Start (FE) + .NET
FastEndpoints (BE) + Keycloak** auth stack where the **always-on SSR server is the
public BFF tier**: the browser only ever talks to `app.<slug>.localhost`; the SSR
server proxies the OIDC dance and fetches page data **server-to-server** from a
.NET API that is **never publicly routable**. Server-owned Postgres session store
(instant revocation), dockerized `*.localhost` harness.

Paste this whole file into a fresh Claude session. It is the spec **and** the
recipe — follow it top to bottom.

> **Sibling template:** `bff-auth-template.md` builds **World B** (browser calls
> `api.<slug>.localhost` directly; client-side `/me` gate). This file builds
> **World A**. Pick one — see "World A vs World B" below.

---

## World A vs World B — pick one before STEP 0

| | **World A — SSR-BFF (this file)** | **World B — direct BFF (`bff-auth-template.md`)** |
|---|---|---|
| Public surface | only `app.` (+ `keycloak.`) | `app.` **and** `api.` |
| Who calls the API | the SSR server, server-to-server | the **browser**, directly |
| Auth gate | `_authenticated` `beforeLoad` (server-side `getMe`) | client `AuthProvider` probing `/me` |
| Page data | SSR loaders → server functions (renders **with data**) | client TanStack Query after the gate |
| API exposure | **internal-only** (`core-api:8080`) | published behind Traefik (`api.`) |
| Cookie | app host-only (re-homed by SSR) | shared parent domain, sent cross-subdomain |
| Best when | you want one origin, no token/host in the client, SSR-with-data, tighter attack surface | you want the API independently reachable (mobile, 3rd-party, simpler FE server) |

Both keep **.NET as the sole token owner** with a revocable Postgres session. World
A simply hides the API behind the SSR server and re-homes the cookie. **The BE is
~95% identical** between the two — World A only changes *where the API lives* and
*who holds the cookie*, not how it mints sessions.

---

## How Claude must work on this

- **Ask me for two things first** (STEP 0), then build everything.
- **Use Serena** for ALL code search/reading/editing (`get_symbols_overview`,
  `find_symbol`, `read_file`, `list_dir`, symbol edits) — never raw grep/sed/cat
  for code.
- **Frontend: load the TanStack intent skills first.** Before substantial FE work
  run `pnpm dlx @tanstack/intent@latest list`, then `load` the relevant skills —
  at minimum **`start-core/server-routes`**, **`start-core/server-functions`**,
  **`start-core/auth-server-primitives`**, and **`router-core/auth-and-guards`** —
  and follow the returned `SKILL.md`. This template is validated against them.
- **Use OpenSpec** if the repos use it: `/opsx:propose` → `/opsx:apply` →
  `openspec validate <name> --strict` → archive. Otherwise implement directly.
- Conventional commits, **lowercase subject** (commitlint `subject-case`). Don't
  push or open PRs unless asked.
- Verify with real builds/tests + an end-to-end harness run before claiming done.

## STEP 0 — ask, then stop and wait

Ask me for **exactly these two values and nothing else**:

1. **BE project name** → use as the .NET project + root namespace `<BeName>` (PascalCase).
2. **FE project name** → use as the pnpm package `<fe-name>` (kebab-case).

Then derive a lowercase alphanumeric **`<slug>`** (drop `_BE`/`_FE`). Local hosts —
note there is **no `api.` host**:

```
parent (registrable domain):  <slug>.localhost
FE / public ingress:  app.<slug>.localhost          ← the ONLY app origin the browser uses
Keycloak:             keycloak.<slug>.localhost      ← browser hits this only for the login form
API (internal):       <be-service>:8080             ← compose-network DNS, NOT routable
realm:                <Realm>      client (confidential): <slug>_api
```

---

## Outcome (what exists when done)

- Unauthenticated visit to `app.<slug>.localhost` → the SSR guard 302/307-redirects
  straight to Keycloak (no client flash, no loading probe).
- Log in → back on `app.<slug>.localhost` showing **"Hello, &lt;user&gt;"** + roles,
  with the dashboard **server-rendered already populated with data** (no "Loading…").
- The browser network tab shows requests to **only** `app.` and `keycloak.` — never
  the API. `curl -H "Host: api.<slug>.localhost" http://127.0.0.1/...` → **404**.
- Logout **revokes the session server-side** → presenting the old cookie to the SSR
  guard → redirect to login (the API would `401`).
- Tokens never reach JS; the API host is never in the client; the cookie holds only
  an opaque session id and is **app-host-only** (re-homed off the API's `Domain`).

---

## Architecture — World A (the organizing rule)

> **The always-on SSR server is the BFF. The browser has exactly one origin
> (`app.`). The .NET API still owns the tokens but is unreachable from the
> internet — only the SSR server (same compose network) calls it.**

```
                         app.<slug>.localhost  (the ONLY browser origin)
Browser ──app-host cookie──► SSR server (TanStack Start) ──server-to-server──► .NET API ──► Keycloak
   │                          │  • /api/auth/$ proxy (re-homes cookies)        (internal   (exchange +
   │                          │  • server fns fetch data w/ forwarded cookie    only)        refresh)
   └── login form ◄───────────┴──► keycloak.<slug>.localhost (302s relayed by the proxy)
```

- **Auth proxy**: `app./api/auth/{login,callback,logout}` → SSR route forwards to
  `API/api/auth/*` server-to-server, **re-homes** each `Set-Cookie` (strip the API's
  `Domain`; app host-only; `__Host-`+`Secure` in prod) and relays status + `Location`.
- **Data**: route loaders call **server functions** (`createServerFn`) that run on the
  SSR server, re-attach the session cookie, and fetch the internal API. Pages render
  **with data** (SSR-with-data).
- **Gate**: an `_authenticated` pathless layout route's `beforeLoad` calls `getMe()`
  server-side and redirects anonymous requests to the login proxy; `me` goes into
  router context for every child route. **No client `/me` probe, no `AuthProvider`.**

The cookie is **app-host-only** (not shared across subdomains), because the browser
never needs to send it to the API — only to `app.`, which forwards it inward. This is
why World A can use the `__Host-` prefix in prod (single origin, `Path=/`, no `Domain`).

## Stack (pin exact versions)

- **FE**: TanStack Start (SSR) + TanStack Router (file-based) + TypeScript strict +
  Tailwind v4 + native `fetch` (no axios) + (optional) react-i18next/TanStack Store.
  Vitest + RTL. pnpm, `save-exact`. Prod served by **srvx** (or Nitro `node-server`).
- **BE**: .NET (latest LTS) + FastEndpoints + EF Core (Npgsql) + Serilog +
  `Microsoft.AspNetCore.Authentication.JwtBearer` + FusionCache. xUnit + Moq +
  EF InMemory; treat-warnings-as-errors. All routes under `api/`. **Identical to
  World B's BE** — see that file's "Exact dependencies" + "BE — components to build".
- **Infra**: PostgreSQL + Keycloak + Traefik + Docker Compose. Only Traefik publishes
  a port; **no `api.` router**.

---

## BE — same as World B, with these deltas only

Build the **entire** BE exactly as `bff-auth-template.md` describes (data + migration →
`SessionStore` → JwtBearer wiring with `OnMessageReceived` cookie resolver → endpoints
`login/callback/logout` → `/me` → cleanup → JIT provisioning). **The C# does not
change.** Only configuration and exposure change:

1. **Keycloak `CallbackUri`** → `http://app.<slug>.localhost/api/auth/callback`
   (the callback lands on the **SSR proxy**, which forwards it inward to the real
   callback endpoint). `AppBaseUrl` / `PostLogoutRedirectUri` → `http://app.<slug>.localhost`.
2. **Realm client `redirectUris`** → `["http://app.<slug>.localhost/api/auth/callback"]`
   (`webOrigins` → `http://app.<slug>.localhost`). The authorize URL's `redirect_uri`
   therefore points at the app origin; Keycloak redirects the browser there; the SSR
   proxy relays the `?code&state` inward.
3. **No public route for the API.** Remove any `api.` Traefik router/label — the API
   is reached only as `<be-service>:8080` on the compose network.
4. **Cookies stay `Domain`-scoped at the API** (`Domain=.<slug>.localhost`) — the SSR
   proxy is what strips `Domain` and app-scopes them. (You may also set the API cookie
   `Domain`-less; the proxy normalizes either way. Keeping the API unchanged from World
   B is simplest.)
5. CORS is **no longer the browser front line** (the browser is same-origin to `app.`),
   but keep `Web__Origins`/`AllowedCorsOrigins` locked to the app origin anyway —
   never `*`.

Everything else (token resolver, session store + revocation, `/me`, claims
transformation, EF model, cleanup service) is byte-for-byte World B.

---

## FE — components to build (`<fe-name>`)

```
src/
  router.tsx                      ← createRouter({ context: { me: null }, … })
  routeTree.gen.ts (generated)    ← run `pnpm generate-routes` after route changes
  styles.css, env.d.ts
  routes/
    __root.tsx                    ← createRootRouteWithContext<RouterContext>()
    _authenticated.tsx            ← beforeLoad guard + identity chip + Outlet
    _authenticated/
      index.tsx                   ← dashboard loader (server fns) → presentational tiles
      <page>.tsx …                ← per-feature loaders
      forbidden.tsx
    api/auth/$.ts                 ← PUBLIC auth proxy (NOT under _authenticated)
  lib/
    server/cookies.ts             ← rehomeSetCookie / forwardCookieHeader / cookiesAreSecure
    server/auth-proxy.ts          ← proxyAuth(request, splat)
    server/api-loaders.ts         ← Me, hasRole, load*(fetchImpl), settle()  (PURE, unit-tested)
    server/api.ts                 ← createServerFn getMe/get*… wrapping the loaders w/ serverFetch
    auth/session.ts               ← login(returnTo)/logout() → same-origin /api/auth/*
  components/…                    ← PRESENTATIONAL (data via props from loaders)
```

### `lib/server/cookies.ts` — pure cookie re-homing (unit-tested)
- `rehomeSetCookie(setCookie, secure)`: rewrite a `Set-Cookie` from the API into an
  app-scoped cookie — **strip `Domain`**, force `Path=/`/`HttpOnly`/`SameSite=Lax`,
  **preserve the lifetime** (`Max-Age`/`Expires`), and when `secure` add the
  **`__Host-` prefix + `Secure`**.
- `forwardCookieHeader(cookieHeader, secure)`: build the `Cookie` header sent to the
  API from the browser's incoming `Cookie` — keep **only** the auth cookies
  (`<sid>`, `<pkce>`) and map `__Host-…` names back to the bare API names.
- `cookiesAreSecure()`: `process.env.COOKIE_SECURE === 'true'` (see gotcha #4 — **not**
  `NODE_ENV`).

### `lib/server/auth-proxy.ts` — `proxyAuth(request, splat)`
Server-to-server proxy for `/api/auth/<splat>`:
1. `secure = cookiesAreSecure()`; `cookie = forwardCookieHeader(request cookie, secure)`.
2. `fetch(`${API_URL}/api/auth/${splat}${search}`, { method, headers: cookie?{cookie}:{}, redirect: 'manual' })`.
3. Build the browser response: relay `status`; copy `Location`; for each upstream
   `Set-Cookie` append `rehomeSetCookie(sc, secure)`; copy `content-type`; pass the body.
`API_URL` is **server-side only** (`http://<be-service>:8080`).

### `routes/api/auth/$.ts` — the PUBLIC proxy route
```ts
import { createFileRoute } from '@tanstack/react-router'
import type {} from '@tanstack/react-start' // activates the `server` route-option augmentation for tsc
import { proxyAuth } from '../../../lib/server/auth-proxy'
const handler = ({ request, params }: { request: Request; params: { _splat?: string } }) =>
  proxyAuth(request, params._splat ?? '')
export const Route = createFileRoute('/api/auth/$')({
  server: { handlers: { GET: handler, POST: handler } },
})
```
Keep this route **outside** `_authenticated` — login must be reachable while anonymous.

### `lib/server/api-loaders.ts` — pure loaders (unit-tested with a mock fetch)
- `Me {id, subject, email?, roles[]}` + `hasRole(me, role)` + `ADMIN_ROLE`.
- `loadMe(fetchImpl)`: `GET /api/me` → `401` ⇒ **`null`** (the guard redirects); other
  non-2xx ⇒ throw.
- `load<Resource>(fetchImpl)`: `GET /api/<resource>` → `401` ⇒ **`throw redirect({ href:
  '/api/auth/login?returnTo=/' })`**; other non-2xx ⇒ throw `Error`.
- `settle(promise)`: wrap into `{data}` / `{error:true}` so one source's outage degrades
  only its tile — but **re-throw redirects** (`isRedirect(e)`) so a revoked session still
  bounces to login.

### `lib/server/api.ts` — server functions
```ts
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
function serverFetch(): typeof fetch {            // re-attach the session cookie, mapped back to the API name
  const secure = cookiesAreSecure()
  const cookie = forwardCookieHeader(getRequestHeader('cookie'), secure)
  return (input, init) => {
    const headers = new Headers(init?.headers)
    if (cookie) headers.set('cookie', cookie)
    return fetch(input, { ...init, headers })
  }
}
export const getMe       = createServerFn({ method: 'GET' }).handler(() => loadMe(serverFetch()))
export const get<Things> = createServerFn({ method: 'GET' }).handler(() => load<Things>(serverFetch()))
```
These run on the SSR server during SSR, and via RPC **to the same SSR server** on client
navigation — so the browser→app-only invariant holds even on in-app navigation.

### Routing — guard + context + SSR-with-data
- **`router.tsx`**: `createRouter({ routeTree, context: { me: null }, … })`.
- **`__root.tsx`**: `export interface RouterContext { me: Me | null }` +
  `createRootRouteWithContext<RouterContext>()({ … })`. No `AuthProvider`.
- **`_authenticated.tsx`** (pathless layout): 
  ```ts
  beforeLoad: async ({ location }) => {
    const me = await getMe()
    if (!me) throw redirect({ href: `/api/auth/login?returnTo=${encodeURIComponent(location.href)}` })
    return { me }
  }
  ```
  Its component renders the identity chip + a Logout button (`logout()` from
  `lib/auth/session.ts`) and an `<Outlet/>`. Children read `me` via `Route.useRouteContext()`.
- **`_authenticated/index.tsx`** (and feature pages): a `loader` that
  `Promise.all([settle(getThis()), settle(getThat())])` and a component that reads
  `Route.useLoaderData()` and renders **presentational** components (data via props).
- **`lib/auth/session.ts`**: `login(returnTo)` → `window.location.assign(
  `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`)`; `logout()` →
  `assign('/api/auth/logout')`. **Same origin** — no API host in the client.
- **Components are presentational**: they take resolved data + an `error` flag as
  props and render a degraded state when `error || !data`. No `useEffect` fetching,
  no loading state (SSR provides the data).

### Env, build, prod
- **No `VITE_API_URL`.** The only API config is the **server-side** `API_URL`
  (`http://<be-service>:8080`), read by the proxy + server functions. Never expose it
  to the client bundle. `env.d.ts` declares no API URL.
- **Prod serve**: the SSR server must actually **run** (it handles `/api/auth/*` + the
  server-function RPC + SSR). With **srvx**: `srvx --prod -s ../client dist/server/server.js`
  — see gotcha #2. With Nitro: `node .output/server/index.mjs`.
- **Dockerfile**: multi-stage; build with `pnpm --filter <fe-name> build`; runtime
  needs production deps present (the SSR entry imports framework code at runtime).
  Pass `API_URL` (and `COOKIE_SECURE=true` in real prod) as **runtime** env, not build
  args. `.dockerignore` excludes `dist`/`.output`/`.nitro`/`.tanstack`/`node_modules`/`.git`/`.env*`.

---

## Harness — `docker-compose.yml` + `harness/keycloak/<Realm>-realm.json`

Services; **only Traefik publishes a port**, and there is **no `api.` router**:

- `proxy` (Traefik v3): `ports: ["80:80"]`. Routing via the provider you can negotiate
  with — **docker labels** if the daemon allows, else the **file provider**
  (`harness/traefik/dynamic.yml`); see gotcha #6. Routes: `app.→<fe>:3000`,
  `keycloak.→keycloak:8080`, plus any `ha.`/`portainer.`. **Define no `api.` route.**
- `postgres` (17-alpine): healthcheck.
- `keycloak` (26): `start-dev --import-realm`; `KC_HOSTNAME=http://keycloak.<slug>.localhost`,
  `KC_HOSTNAME_STRICT=false`, `KC_HTTP_ENABLED=true`, `KC_PROXY_HEADERS=xforwarded`;
  mount `./harness/keycloak`.
- `<be-service>` (build the BE): env Authority
  `http://keycloak.<slug>.localhost/realms/<Realm>`, ClientId `<slug>_api`, secret,
  **`CallbackUri=http://app.<slug>.localhost/api/auth/callback`**,
  AppBaseUrl/PostLogout `http://app.<slug>.localhost`, `SessionCookies__Domain=.<slug>.localhost`,
  Postgres conn; **`extra_hosts: ["keycloak.<slug>.localhost:host-gateway"]`**.
  **No Traefik route** — internal only.
- `<fe>` (build the FE): env **`API_URL=http://<be-service>:8080`** (server-side),
  optionally `COOKIE_SECURE=true` in real prod; Traefik route `Host(app.<slug>.localhost)`
  → :3000. `depends_on: <be-service>`.

Realm import JSON: realm `<Realm>`; roles `Admin`,`User`; **confidential** client
`<slug>_api` (`publicClient:false`, secret, **`redirectUris:[http://app.<slug>.localhost/api/auth/callback]`**,
`attributes.post.logout.redirect.uris` `##`-separated = `http://app.<slug>.localhost`,
`pkce.code.challenge.method:S256`); test user `testuser`/`Test123!` with realm roles
`Admin`,`User`.

---

## CRITICAL gotchas (each cost real debugging — bake them in)

1. **`server` route-option doesn't typecheck alone.** `createFileRoute(...).server`
   needs the TanStack Start type augmentation (declared in `start-client-core`) in the
   TS program. Any module importing `@tanstack/react-start` (e.g. `lib/server/api.ts`)
   activates it globally; the standalone proxy route adds
   `import type {} from '@tanstack/react-start'` so it typechecks on its own.
2. **srvx `--static` is resolved relative to the server-entry directory**, not the cwd.
   Use `-s ../client` (sibling of `dist/server`); `-s dist/client` silently disables
   static serving and every `/assets/*` 404s → the SSR shell loads but is unstyled.
3. **The SSR server must RUN in prod** — it is the BFF, not a static host. A static-only
   serve breaks `/api/auth/*` and every server function. Run the server entry (srvx/Nitro).
4. **`__Host-`/`Secure` are gated on `COOKIE_SECURE`, NOT `NODE_ENV`.** A prod build run
   over plain HTTP locally would drop `Secure` cookies and lock you out. Add `__Host-`+
   `Secure` only when `COOKIE_SECURE=true` (i.e. real HTTPS). `__Host-` also **requires**
   `Path=/` and **no `Domain`** — which the re-homing already enforces.
5. **Re-home AND forward back.** Outbound: strip the API's `Domain`, app-scope, add
   `__Host-` in prod. Inbound: map the app cookie name (`__Host-…` in prod) **back** to
   the API name and forward **only** the auth cookies. Forget either half and the
   session silently never reaches the API.
6. **Traefik provider negotiation.** If the docker daemon's min API version rejects
   Traefik's docker provider (e.g. min API 1.40), the docker labels are inert — switch
   to the **file provider** (`--providers.file.directory`, `harness/traefik/dynamic.yml`)
   and define routes there. Either way: **define no `api.` route.**
7. **Keycloak issuer must match from BOTH the browser and the BE container** or `iss`
   validation 401s. `KC_HOSTNAME=http://keycloak.<slug>.localhost` + the BE
   `extra_hosts: ["keycloak.<slug>.localhost:host-gateway"]` so the same URL resolves inside.
8. **Realm import**: post-logout redirects go in the client `attributes` as
   `post.logout.redirect.uris` (`##`-separated); a top-level `postLogoutRedirectUris`
   aborts the Keycloak 26 import → discovery 404 → login 500. Import only happens into a
   **fresh** Keycloak state (`--import-realm` skips existing realms) — recreate the
   container after changing the realm JSON.
9. **Callback still redirects to the ABSOLUTE app URL** `{AppBaseUrl}{returnTo}`. The
   browser hits `app./api/auth/callback`; the proxy forwards `?code&state` + the PKCE
   cookie inward; the BE exchanges and 302s to `{AppBaseUrl}{returnTo}`, which the proxy
   relays. Keep `returnTo` sanitized (relative, single leading `/`) — no open redirect.
10. **Route guards do NOT protect server functions.** A `beforeLoad` gate is UX; the
    real boundary is the .NET `[Authorize]` on every data endpoint. Server functions
    must forward the cookie and let the API decide — never trust the guard alone.
11. **`*.localhost` resolution**: browsers auto-resolve to loopback (RFC 6761) — no
    `/etc/hosts`. `curl` needs `-H "Host: app.<slug>.localhost" http://127.0.0.1/` (it
    won't auto-resolve). Assert internal-only with
    `curl -H "Host: api.<slug>.localhost" http://127.0.0.1/...` → **404**.

---

## Verify before claiming done

- BE: build warning-clean; tests green (store, token hashing, returnTo sanitizer,
  PKCE/state codec, cookie resolver, `/me`/guard). FE: `pnpm generate-routes`,
  `typecheck`+`lint`+`test`+`build` clean. **Unit-test the pure pieces**: `cookies.ts`
  (re-home dev/prod/clearing; forward dev/prod/empty) and `api-loaders.ts`
  (`loadMe` 401→null; data loaders 401→redirect, 5xx→throw; `settle` data/error/
  redirect-passthrough).
- `docker compose up -d --build` → services healthy, realm imports (fresh keycloak).
- **Routing**: `Host: api.<slug>.localhost` → **404**; anonymous `app./` → **302/307**
  to `/api/auth/login`; `app./api/auth/login` → **302** to Keycloak with
  `redirect_uri=app./api/auth/callback` and a **re-homed PKCE cookie** (no `Domain`).
- **End-to-end (Playwright)** — the browser only ever opens `app.` and `keycloak.`:
  1. Anonymous `app./` → bounced to the Keycloak login form.
  2. Log in (`testuser`/`Test123!`) → identity chip + nav render.
  3. **SSR-with-data**: the raw server HTML (cookie via the shared request context, no
     JS) already contains the identity **and** live tile data, with **no "Loading…"**.
  4. **Revocation**: capture the session cookie; logout; present the revoked cookie
     straight to the SSR guard (`request.get(app./, { maxRedirects: 0 })`) → **302/307**
     to `/api/auth/login` (the API would `401`).

## Suggested build order

1. (If OpenSpec) propose specs. 2. **BE = World B verbatim**, then apply the 5 config
   deltas above (callback/redirect → `app.`; no `api.` route). 3. FE data layer:
   `cookies.ts` (+tests) → `auth-proxy.ts` + `routes/api/auth/$.ts` →
   `api-loaders.ts` (+tests) → `api.ts` server functions. 4. FE routing:
   `createRootRouteWithContext` + router `context` → `_authenticated` guard → move
   pages under `_authenticated/` as **loaders** feeding presentational components;
   delete any browser API client / `AuthProvider` / `VITE_API_URL`. 5. Harness compose
   (BE internal, FE `API_URL`) + realm import. 6. Verify end-to-end incl. `api.`→404,
   SSR-with-data, and revocation.
```
