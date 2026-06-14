## Why

The roadmap pairs `tasks` with `calendar`; it was the explicit deferred follow-up. It reuses the
CalDAV + SSR-BFF write pattern just proven by `calendar`, so it's low-risk, and it rounds out the
"what's on my plate today" centerpiece (events **and** to-dos).

## What Changes

- New **`tasks` plugin** — a `plugins/tasks/tasks.api` .NET classlib implementing `IPlugin`
  (id `tasks`; manifest: nav "Tasks", `routeBase` `/tasks`, widget `tasks-open`). FastEndpoints
  under `api/tasks`: **list** (open by default; `?all=true` includes completed), **create**,
  **update**, **toggle complete**, **delete** (VTODO). A `TaskDavClient` (named `HttpClient`)
  behind `ITaskClient`; hand-rolled `TaskIcs` VTODO serialize/parse — same approach as
  `CalendarIcs`, no `Ical.Net`. Registered in the three compile-time places; endpoints require
  auth; plugin services via lazy `Resolve<T>()`.
- Reuses the **running Radicale** service with a **separate `/pcc/tasks/` collection** (VTODO),
  same credentials as `calendar`. Config `Plugins:Tasks:{Enabled,BaseUrl,Collection,Username,
  Password}`.
- `@pcc/contracts`: a `TodoItem` type (`{ uid, title, due?, completed, description? }`) + input
  shape + typed client methods (`getTasks` + create/update/delete).
- Web (SSR-BFF, read + write — mirroring `calendar`): `lib/server` `getTasks` loader server fn +
  `createServerFn({ method: 'POST' })` mutations; a `/tasks` route under `_authenticated` as an
  **SSR loader**; a `tasks-open` dashboard tile (open/overdue count); and a `/tasks` page (list with
  a complete checkbox + create form + edit/delete) that calls the mutations then invalidates.
- **Graceful degradation**: Radicale unreachable/unconfigured → `502`, tile/page degrade — the IoT
  contract. `MKCALENDAR`-on-existing tolerates **405 and 409** (the Radicale gotcha calendar hit).

## Capabilities

### New Capabilities

- `tasks`: read + write CalDAV to-do (VTODO) management — the `api/tasks` list/create/update/
  complete/delete endpoints, the CalDAV client + iCalendar VTODO mapping, config-driven activation,
  graceful degradation, and the "Tasks" nav/page/`tasks-open` tile UI surfaces.

### Modified Capabilities

<!-- None. `web-shell` (plugin-driven nav/tiles/SSR loaders) and `plugin-host` (compile-time
     registration, config-driven activation, manifest) already cover this generically; `tasks`
     is a new instance, like `calendar`. -->

## Impact

- **Infra**: no new service — reuses `radicale` with a `/pcc/tasks/` collection (created on demand
  via `MKCALENDAR`); core-api gains `Plugins:Tasks:*` config + a named CalDAV `HttpClient`.
- **Backend**: new `plugins/tasks/tasks.api` project + 3 registration points; core-api Dockerfile
  copies it. Second write-path plugin (POST/PUT/DELETE), incl. a "toggle complete" update.
- **Contracts**: `@pcc/contracts` gains `TodoItem` + client methods.
- **Web**: new `_authenticated/tasks` route, server functions (read + mutations), a dashboard tile,
  and write UI — reuses the calendar mutation-through-the-SSR-BFF pattern.
- **Tests**: VTODO ics client/unit tests, `api/tasks` integration tests, contracts client tests,
  web component tests, route/tile, and a live E2E. All existing gates stay green.
