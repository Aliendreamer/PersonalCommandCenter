## Why

The command center still has no "what's today" view — its intended centerpiece. `calendar` is
the next plugin on the roadmap and the first **read + write** plugin, so it also establishes the
mutation-through-the-SSR-BFF pattern (browser → SSR server function → core-api → CalDAV) that
`tasks`, `notes`, and later plugins will reuse.

## What Changes

- Add a lightweight **Radicale** CalDAV service to `docker-compose.yml` (self-contained like
  `keycloak`/`postgres`/`home-assistant`; internal on the compose network; credentials in the
  gitignored `.env`). No Nextcloud.
- New **`calendar` plugin** — a `plugins/calendar/calendar.api` .NET classlib implementing
  `IPlugin` (id `calendar`; manifest: nav label "Calendar", `routeBase` `/calendar`, widget
  `calendar-today`). FastEndpoints endpoint classes under `api/calendar`: **list** events for a
  window (today/upcoming), **create**, **update**, **delete** (VEVENT). A `CalDavClient`
  (named `HttpClient`) talks to Radicale via an `ICalendarClient` abstraction; parses/emits
  iCalendar VEVENT. Registered in the three compile-time places (`CoreApi.csproj`, `Program.cs`
  `pluginAssemblies`, `PersonalCommandCenter.slnx`); endpoints require auth; plugin services via
  lazy `Resolve<T>()`.
- `@pcc/contracts`: a shared `CalendarEvent` type + typed client methods (list + create/update/
  delete shapes).
- Web (SSR-BFF, read + write): `lib/server` server functions — `getCalendarEvents` (loader) plus
  `createServerFn({ method: 'POST' })` mutations that forward the session cookie; a `/calendar`
  route under `_authenticated` as an **SSR loader** (renders with data); a "what's today"
  dashboard tile (presentational, data via props, degrades on error like the IoT tile); and a
  write UI (create/edit/delete) that calls the mutations then invalidates the loader.
- **Graceful degradation**: when Radicale is unconfigured/unreachable, `api/calendar/*` returns
  `502` and the tile/page show a degraded state — same contract as IoT without an HA token.

`tasks` (VTODO) is explicitly **out of scope** — a follow-up change reusing the CalDAV client.

## Capabilities

### New Capabilities

- `calendar`: read + write CalDAV calendar (VEVENT) integration — the `api/calendar` list/create/
  update/delete endpoints, the CalDAV client + iCalendar mapping, config-driven activation,
  graceful degradation, and the "Calendar" nav/page/`calendar-today` tile UI surfaces.

### Modified Capabilities

<!-- None. `web-shell` (plugin-driven nav/tiles/SSR loaders) and `plugin-host` (compile-time
     registration, config-driven activation, manifest) already cover this generically; `calendar`
     is a new instance, not a requirement change to them. -->

## Impact

- **Infra**: new `radicale` compose service + a config/data volume; `.env` gains CalDAV
  credentials (e.g. `CALDAV_USER`/`CALDAV_PASSWORD`); core-api gains `Plugins:Calendar:*` config
  (BaseUrl, credentials, default window) and a named CalDAV `HttpClient`.
- **Backend**: new `plugins/calendar/calendar.api` project + 3 registration points; first plugin
  with **write** endpoints (POST/PUT/DELETE).
- **Contracts**: `@pcc/contracts` gains `CalendarEvent` + client methods.
- **Web**: new `_authenticated/calendar` route, server functions (read + mutations), a dashboard
  tile, and write UI — the first use of `createServerFn` **mutations** through the SSR-BFF.
- **Tests**: CalDAV client/unit tests, `api/calendar` integration tests (CoreApi.Tests), contracts
  client tests, web component tests, route/tile. All existing gates stay green.
