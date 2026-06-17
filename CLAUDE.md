# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**PersonalCommandCenter** — a personal command-center / dashboard. A .NET 10 **FastEndpoints**
host serves a plugin-based backend; a TanStack Start (React, SSR) web shell discovers enabled
plugins from a manifest and renders their nav entries, dashboard tiles, and routes. The whole app
sits **behind Keycloak login**. The **always-on SSR server is the public BFF tier** (SSR-BFF): the
browser only ever talks to `app.pcc.localhost`; the SSR server proxies the OIDC auth dance and
fetches page data server-to-server from core-api (internal-only). Plugins: `system` (host status),
`iot` (read-only Home Assistant monitoring), `calendar` (read + write CalDAV events — the first
write-path plugin, mutations flow through the SSR-BFF), `tasks` (read + write CalDAV to-dos / VTODO,
same Radicale, a separate collection), `notifications` (an in-app alert-bus + notification center
with best-effort **ntfy** push), `search` (read-only metasearch via a self-hosted **SearXNG**),
`weather` (read-only forecast via keyless **Open-Meteo**), `rss` (read-only RSS/Atom aggregator),
`goodreads` (read-only shelf via Goodreads **RSS**, the official API is retired), and `uptime`
(read-only service health board — HTTP-pings configured targets, no new container).

## Stack & layout

Polyglot monorepo: **pnpm workspace + Nx** for the TypeScript side, a **.slnx** solution for
the .NET side. Package manager **pnpm@10.x**, **.NET SDK 10**.

```
apps/core-api          .NET 10 FastEndpoints host (CoreApi.csproj); auth authority (Auth/), EF (Data/); Scalar at /scalar; internal-only
apps/web               TanStack Start SSR shell + BFF tier (React); SSR server proxies /api/auth/* & fetches data server-side; prod served by srvx
libs/plugin-abstractions  .NET IPlugin + PluginManifest contract (Pcc.Plugins)
libs/contracts         Shared TS types + typed API client (@pcc/contracts)
plugins/system         SystemPlugin classlib  (id "system")
plugins/iot            IotPlugin classlib     (id "iot", Home Assistant)
plugins/calendar       CalendarPlugin classlib (id "calendar", CalDAV read+write; hand-rolled VEVENT)
plugins/tasks          TasksPlugin classlib    (id "tasks", CalDAV read+write VTODO; /pcc/tasks/)
plugins/notifications  NotificationsPlugin classlib (id "notifications"); host owns the bus/store
plugins/search         SearchPlugin classlib   (id "search", read-only SearXNG metasearch)
plugins/weather        WeatherPlugin classlib  (id "weather", read-only Open-Meteo forecast, no key)
plugins/rss            RssPlugin classlib      (id "rss", read-only RSS/Atom aggregator)
plugins/goodreads      GoodreadsPlugin classlib (id "goodreads", read-only shelf via Goodreads RSS)
plugins/uptime         UptimePlugin classlib   (id "uptime", read-only HTTP health board)
tests/CoreApi.Tests    xUnit + Mvc.Testing integration/unit tests
harness/keycloak       Pcc realm import (roles Admin/User, client pcc_api, testuser/Test123!)
harness/radicale       Radicale CalDAV config + dev login (pcc/pcc-dev-caldav); internal-only
harness/searxng        SearXNG settings (JSON format on, limiter off, dev secret); internal-only
harness/traefik        Traefik file-provider routes (*.pcc.localhost)
openspec/              Spec-driven change workflow (proposals → specs → tasks → archive)
docker-compose.yml     Traefik + core-api + web + home-assistant + keycloak + postgres + radicale + ntfy + searxng + base-infra (ollama/qdrant/redis/portainer/wakapi)
```

## Commands

```bash
# .NET (run from repo root; the .slnx is auto-detected)
dotnet build                              # warnings are errors (see Gotchas)
dotnet test                               # all CoreApi.Tests
dotnet test --filter FullyQualifiedName~IotEndpointTests   # a single test class
dotnet format --verify-no-changes         # code-STYLE gate (IDExxxx); `dotnet format` to fix

# Frontend / TS (Nx)
pnpm typecheck        # nx run-many -t typecheck   (per-project: nx typecheck web)
pnpm lint             # nx run-many -t lint
pnpm test             # nx run-many -t test        (vitest)
pnpm build            # nx run-many -t build
pnpm format:check     # prettier --check .         (`pnpm format` to fix)
pnpm --filter web dev # vite dev server on :3000

# Full stack — public ingress behind Traefik on http://*.pcc.localhost (only Traefik publishes :80)
docker compose up -d --build              # app. / keycloak. / ha. / portainer.pcc.localhost
# core-api is NOT routable (SSR-BFF) — reach it only as core-api:8080 on the compose network.
# curl through Traefik (curl won't auto-resolve *.localhost like a browser does):
#   curl -H "Host: app.pcc.localhost" http://127.0.0.1/

# Release (Nx, conventional commits; projects: web + @pcc/contracts, fixed versioning)
pnpm release:dry
```

## Architecture: the plugin model

The host does **not** dynamically scan assemblies. Plugins are registered at **compile time**
in `apps/core-api/Program.cs`:

```csharp
Assembly[] pluginAssemblies = [typeof(SystemStatusPlugin).Assembly, typeof(IotPlugin).Assembly];
```

A `PluginRegistry` activates only plugins whose `Plugins:{Id}:Enabled` config is `true` and exposes
their manifests at `GET /api/plugins`. An `IPlugin` (`libs/plugin-abstractions`) supplies an `Id`,
a `PluginManifest` (nav label, route base, widget ids), and `Configure(services, config)`. A
plugin's HTTP routes are **FastEndpoints endpoint classes** in its assembly (no `MapEndpoints`);
`UseFastEndpoints` registers them with prefix `api` and a `Endpoints.Filter` that drops endpoints
from disabled plugins' assemblies. The web shell fetches `/api/plugins` **server-side** (a
`createServerFn` called from a route loader, forwarding the session cookie) so pages render with
data (SSR-with-data); each source is `settle()`d so one plugin's outage degrades only its tile.

**Auth (SSR-BFF):** core-api stays the auth **authority** (owns the Keycloak OIDC exchange + tokens;
opaque `HttpOnly` `mp_sid` cookie; Postgres session store `Auth/SessionService` → instant
revocation) but is **internal-only**. The browser talks solely to `app.pcc.localhost`; the SSR
server is the public BFF:
- `apps/web/src/routes/api/auth/$.ts` proxies `api/auth/login|callback|logout` to core-api,
  **re-homing** each `Set-Cookie` (`apps/web/src/lib/server/cookies.ts`: strip `Domain`, app-scope;
  `__Host-`+`Secure` in prod) and forwarding the cookie back (mapped to the API name) on the way in.
- `apps/web/src/lib/server/api.ts` server functions (`getMe`/`getPlugins`/`getSystemStatus`/
  `getIotEntities`) fetch core-api server-to-server; the `_authenticated` route's `beforeLoad` calls
  `getMe()` and redirects anonymous requests to `/api/auth/login`, putting `me` in router context.

core-api's auth code (`apps/core-api/Auth/`) is unchanged by the SSR-BFF cutover — only Keycloak
`redirectUri` + `CallbackUri` config moved to `app.pcc.localhost/api/auth/callback`. See
`openspec/changes/archive/2026-06-14-ssr-bff-auth-v2/`.

### Adding a plugin (the non-obvious part)

Because wiring is compile-time, a new plugin must be added in **three** places, or it won't load:
1. `plugins/<name>/<name>.api/` — classlib implementing `IPlugin` + FastEndpoints endpoint classes
2. `apps/core-api/CoreApi.csproj` — a `<ProjectReference>` to it
3. `apps/core-api/Program.cs` — its assembly in the `pluginAssemblies` array
4. `PersonalCommandCenter.slnx` — register the project in the solution

Plugin endpoints require auth by default; use lazy `Resolve<T>()` (not constructor injection) for
plugin services so the host can instantiate the endpoint at startup even when the plugin is disabled.

Follow the TDD ordering used by `iot`/`system`: client/unit tests → endpoint integration tests
→ `@pcc/contracts` type + client → web component test → page + dashboard tile.

## Workflow (required)

Every change: **OpenSpec proposal → TDD → all gates green before "done"** (see the `dev-flow`
skill and `openspec/`). Commit directly on `main` (no `feat/*` branches for now). Gates =
`dotnet build` + `dotnet test` + `dotnet format --verify-no-changes` and
`pnpm typecheck/lint/test/build` + `pnpm format:check`.

**Frontend (apps/web) — always load TanStack skills first.** Before substantial frontend work,
run the TanStack intent skill check and load the matching skill (see `AGENTS.md`):

```bash
pnpm dlx @tanstack/intent@latest list                 # see available skills
pnpm dlx @tanstack/intent@latest load <package>#<skill> # then follow the returned SKILL.md
```

## Gotchas

- **Warnings are errors** (`Directory.Build.props`: `TreatWarningsAsErrors=true`). Compiler +
  analyzer (CAxxxx) warnings fail `dotnet build`; code STYLE (IDExxxx) is a separate gate via
  `dotnet format`. `Nullable` + `ImplicitUsings` are on.
- **Plugins are compile-time**, not auto-discovered — see "Adding a plugin" above.
- **srvx `--static` is resolved relative to the server-entry directory**, not the cwd. The web
  prod command uses `-s ../client` (sibling of `dist/server`); `-s dist/client` silently
  disables static serving and every `/assets/*` 404s. (See `apps/web/Dockerfile`.)
- **SSR-BFF cookie re-homing** (`apps/web/src/lib/server/cookies.ts`): core-api sets `Domain`-scoped
  `mp_sid`/`mp_pkce`; the SSR proxy strips `Domain` (app host-only) and forwards them back under the
  API name. `__Host-`+`Secure` are added in prod, gated on **`COOKIE_SECURE=true`** (NOT `NODE_ENV` —
  the prod build runs over plain HTTP locally, where `Secure` cookies would be dropped).
- **TanStack server routes/functions** need the `server` route-option type augmentation in scope for
  `tsc`; any module importing `@tanstack/react-start` (e.g. `lib/server/api.ts`) activates it. The
  standalone proxy route adds a `import type {} from '@tanstack/react-start'` so it typechecks alone.
- **IoT needs a Home Assistant token** in `.env` (`HA_TOKEN`, gitignored); without it
  `/api/iot/entities` returns 502 by design (the dashboard tile degrades, page still renders).
- **Calendar uses Radicale (CalDAV), internal-only** (`radicale:5232`, no Traefik route). Dev login
  `pcc/pcc-dev-caldav` is committed in `harness/radicale/users` (like the Keycloak `testuser`);
  override at core-api with `.env` `CALDAV_USER`/`CALDAV_PASSWORD` (then update `users` to match).
  `CalDavClient` `MKCALENDAR`s the collection on demand — Radicale answers **409 Conflict** (not 405)
  when it already exists, so both are treated as "exists". Unconfigured/unreachable → `502` (degrades).
  `tasks` reuses the same Radicale with a **separate `/pcc/tasks/`** collection (VTODO). The dev
  Radicale drops connections under concurrent load, so the live-stack **E2E runs serially**
  (`workers: 1` in `tests/e2e/playwright.config.ts`).
- **Calendar writes flow through the SSR-BFF**: the `/calendar` page calls `createServerFn({ method:
  'POST' })` mutations (`createCalendarEvent`/`update`/`delete` in `lib/server/api.ts`) which forward
  the cookie to core-api, then `router.invalidate()` re-runs the loader. The browser never calls the
  API directly — the first write-path plugin establishes this pattern for `tasks`/`notes`/etc.
- **iCalendar is hand-rolled** (`CalendarIcs`, VEVENT subset) — no `Ical.Net`. v1 covers UID/SUMMARY/
  DTSTART/DTEND/all-day/LOCATION/DESCRIPTION + UTC; recurrence (RRULE) and timezones are non-goals.
- **Notifications are a host-level alert-bus, not just a plugin.** `INotificationPublisher`/
  `INotificationStore` live in `libs/plugin-abstractions`; the host `NotificationService` (over a
  `Notification` EF entity + the `AddNotifications` migration) is registered **unconditionally** so
  any code can publish even when the `notifications` plugin UI is off. Publish persists first, then
  **best-effort** POSTs to **ntfy** (`Notifications:Ntfy:{BaseUrl,Topic}`; failures swallowed — the
  DB row is the source of truth). ntfy is internal (`ntfy:80`, `ntfy.pcc.localhost` web UI); external
  reachability/domain is deferred. The host seeds one "Command center online" notification on startup
  (non-Development). Enum severities serialize as strings (`JsonStringEnumConverter`) to match the
  TS contracts.
- **Integration tests share one InMemory DB per factory.** `TestFactoryExtensions.Authed` hoists the
  `UseInMemoryDatabase("authed-…")` name **out of the options lambda** — inside it, `Guid.NewGuid()`
  ran per scope, so a seed in one scope was invisible to the request pipeline's scope.
- **Search self-hosts SearXNG** (`harness/searxng/settings.yml`): its JSON API is **off by default**
  and the bot **limiter would block** core-api's server-to-server queries — the settings enable
  `search.formats: [json]` and set `limiter: false`. Internal-only (`searxng:8080`,
  `searxng.pcc.localhost` UI). `/search?q=` is the app's **first query-param SSR loader** (`validateSearch`
  + `loaderDeps` on `q`; the loader skips the API when `q` is empty).
- **Weather is keyless Open-Meteo** (`api.open-meteo.com`, no token, no container) — config is just
  `Plugins:Weather:{Latitude,Longitude,ForecastDays}`. Maps WMO weather codes to text (`WmoCodes`).
- **RSS/Goodreads parse with `System.ServiceModel.Syndication`, buffered first.** Both read the feed
  into a `byte[]` (`GetByteArrayAsync`) and parse from a `MemoryStream` — **never** `XmlReader` over a
  live `GetStreamAsync` response: `SyndicationFeed.Load` reads synchronously, and sync-over-async on
  the HttpClient response stream **throws under the container runtime** (works on the host, 502s in
  Docker). `rss` aggregates `Plugins:Rss:Feeds[]` newest-first (a single bad feed is skipped; all-bad
  → 502). **Goodreads' official API is retired** (2020) → it reads the shelf **RSS**
  (`/review/list_rss/{UserId}?shelf=`) and pulls custom `<author_name>`/`<book_large_image_url>`
  element extensions; empty `UserId` → 502 (tile degrades). Public feeds like **hnrss.org rate-limit
  (429)** aggressively — the rss E2E tolerates either items or the degraded notice.
- **Uptime adds no container** — it HTTP-pings `Plugins:Uptime:Targets[{Name,Url}]` concurrently
  (timeout-bounded), `Up` = status `< 400`; a **down target is data (200)**, only an empty target set
  → 502. The dogfood targets are PCC's own services (core-api `/health`, keycloak). Docker-socket
  container health is a deferred follow-up.
- **External-link components must `safeHref`** (`apps/web/src/lib/safe-href.ts`): any tile/list
  rendering a third-party URL (`rss`, `search`, `goodreads` covers + links) routes the href through
  `safeHref` (http/https only, else `#`) + `rel="noreferrer noopener"` to block `javascript:`/`data:` XSS.
- **Public ingress is Traefik on `*.pcc.localhost`** (`app./keycloak./ha./portainer.`) — **no `api.`
  router**: core-api is internal-only, reached as `core-api:8080` on the compose network. The
  `mp_sid` cookie is app-scoped (`SameSite=Lax`). Browsers auto-resolve `*.localhost`; `curl` needs
  `-H "Host: …" http://127.0.0.1`. CORS on core-api is no longer the browser front line (the browser
  is same-origin to `app.`), but `Web__Origins` stays locked to the app origin — never `*`.
- **Traefik uses the file provider** (`harness/traefik/dynamic.yml`), not docker labels — its
  docker provider can't negotiate with this daemon (min API 1.40). Add new routes there.
- **PCC compose is the leading/canonical infra hub** — it self-hosts a **shared base-infra stack**
  (`ollama` with GPU, `qdrant`, `redis`, `portainer`, `wakapi`) the user's *other* projects share
  (no duplicate instances). **Access is router-only** (`ollama./qdrant./wakapi./portainer.pcc.localhost`)
  — **no per-service host ports**, the one exception being **Redis** (TCP → `localhost:6379`). These
  base services are **not** behind the app's Keycloak login (raw infra; dev-defaults, no auth). Ollama
  gets the GPU via `deploy.resources.reservations.devices` (NVIDIA `nvidia` runtime; drop it to fall
  back to CPU). Wakapi = WakaTime-compatible coding-activity tracker (VS Code → `api_url
  http://wakapi.pcc.localhost/api`). Endpoint reference lives in `DOCKER_SETUP.md`. See
  `openspec/changes/archive/*-base-infra/`.
- **JwtBearer `RequireHttpsMetadata`** is derived from the Authority scheme; the local harness is
  HTTP (`http://keycloak.pcc.localhost`), so it's off — don't hardcode it true.
- **EF migrations apply on startup** outside Development (`Database.MigrateAsync` in `Program.cs`);
  generate with `dotnet ef migrations add <Name> --project apps/core-api --output-dir Data/Migrations`.
- **FE is whole-app-behind-login via the SSR-BFF**: the browser never calls core-api — it hits only
  `app.pcc.localhost`. The `_authenticated` `beforeLoad` guard (server-side `getMe()`) gates every
  route; there is no client `/me` probe. The SSR server reaches core-api via the **server-side**
  `API_URL` env (`http://core-api:8080`); there is **no** `VITE_API_URL` baked into the client.
