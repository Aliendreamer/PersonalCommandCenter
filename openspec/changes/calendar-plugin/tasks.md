## 1. Infra — Radicale CalDAV service

- [x] 1.1 Add a `radicale` service to `docker-compose.yml` (internal only, **no** Traefik route;
      config + data volume; HTTP Basic via an htpasswd user). core-api reaches it as `radicale:5232`;
      `Plugins:Calendar:*` config + `${CALDAV_USER:-pcc}`/`${CALDAV_PASSWORD:-pcc-dev-caldav}`.
- [x] 1.2 Add `harness/radicale/` (config: htpasswd plain auth, owner_only rights, storage; `users`
      with the committed dev login; README). Collection `/pcc/calendar/` is created on demand via
      `MKCALENDAR` (no manual seeding). `appsettings.json` gains `Plugins:Calendar` defaults.
- [x] 1.3 `docker compose config` valid; `radicale` comes up and authenticates the dev credential
      over Basic auth (returns its UI) on the compose network.

## 2. Backend — CalDAV client + `calendar` plugin (TDD)

- [x] 2.1 (TDD) Create `plugins/calendar/calendar.api` classlib; add `ICalendarClient` + a
      `CalendarEvent` model. Add `Ical.Net`. Unit-test the iCalendar mapping: parse `calendar-data`
      → `CalendarEvent` and build a VEVENT from a create request (round-trip incl. `allDay`).
- [x] 2.2 Implement `CalDavClient : ICalendarClient` over a named `HttpClient` (Basic auth +
      `CalendarOptions` from config): `ListAsync(window)` via `REPORT` calendar-query,
      `CreateAsync`/`UpdateAsync` via `PUT {collection}/{uid}.ics`, `DeleteAsync` via `DELETE`.
      Unit-test request shaping with a stub `HttpMessageHandler` (method/URL/auth/body).
- [x] 2.3 Implement `CalendarPlugin : IPlugin` (id `calendar`; manifest nav "Calendar",
      `routeBase` `/calendar`, widget `calendar-today`; `Configure` registers `ICalendarClient`,
      the named `HttpClient`, and `CalendarOptions`). Use lazy `Resolve<T>()` in endpoints.
- [x] 2.4 FastEndpoints endpoint classes under `api/calendar`: `GET events` (window/`days`),
      `POST events` (validate `end >= start` → `400`), `PUT events/{uid}`, `DELETE events/{uid}`.
      Map `ICalendarClient` failure/unconfigured → `502`, unknown uid → `404`.
- [x] 2.5 Register the plugin in the three compile-time places — `CoreApi.csproj`
      `<ProjectReference>`, `Program.cs` `pluginAssemblies`, `PersonalCommandCenter.slnx` — and add
      `Plugins:Calendar:{Enabled,BaseUrl,Collection,Username,Password,WindowDays}` to
      `appsettings`/compose env.
- [x] 2.6 (TDD) `CoreApi.Tests` integration tests (xUnit + Mvc.Testing, fake `ICalendarClient`):
      listing returns mapped events; create → `201` + `uid` + appears in a listing; `end < start`
      → `400`; update/delete happy paths + `404`; disabled plugin absent from `/api/plugins` and
      endpoints not served; CalDAV failure → `502`.

## 3. Contracts — shared types + client (TDD)

- [x] 3.1 (TDD) `@pcc/contracts`: add `CalendarEvent` (+ create/update input shapes) and client
      methods `getCalendarEvents` / `createCalendarEvent` / `updateCalendarEvent` /
      `deleteCalendarEvent`; client tests against a mock fetch.

## 4. Web — read path (SSR-with-data)

- [x] 4.1 (TDD) `lib/server`: a pure `loadCalendarEvents(fetchImpl)` (401 → redirect, other non-ok
      → throw) + the `getCalendarEvents` server function wrapping it with the cookie-forwarding
      `serverFetch`; unit-test the pure loader (mock fetch, assert URL + cookie forwarding).
- [x] 4.2 `calendar-today` tile — presentational (`{ events?, error? }`): renders today's events or
      an empty state, and a degraded "Calendar unavailable" on error; component test.
- [x] 4.3 `_authenticated/calendar` route: loader calls `getCalendarEvents` (via `settle`); the
      page renders the events **server-side**; the dashboard renders the `calendar-today` tile for
      the `calendar-today` widget. `pnpm --filter web generate-routes`.

## 5. Web — write path (mutations through the SSR-BFF, TDD)

- [x] 5.1 (TDD) `lib/server`: `createCalendarEvent`/`updateCalendarEvent`/`deleteCalendarEvent`
      server functions (`createServerFn({ method: 'POST' })`) forwarding the cookie to
      `POST/PUT/DELETE api/calendar/events`; unit-test the pure mutation helpers (mock fetch; assert
      method, body, and cookie forwarding).
- [x] 5.2 Calendar page write UI: a create form + per-event edit/delete actions that call the
      mutation server functions and then `router.invalidate()` so the loader re-runs and the view
      refreshes; component tests for the form/validation behavior.

## 6. Verify + done gate

- [ ] 6.1 FE gates green: `generate-routes`; `nx run-many -t typecheck lint test build`
      (web + `@pcc/contracts`) + `prettier --check`.
- [ ] 6.2 .NET gates green: `dotnet build` (warnings = errors) + `dotnet test` (new calendar tests
      green, existing 46 still green) + `dotnet format --verify-no-changes`.
- [ ] 6.3 E2E (Playwright, live stack with `radicale`): `docker compose up -d --build`; login;
      `/calendar` is **server-rendered with events**; create an event from the UI → it appears and
      the browser only ever hit `app.`; `calendar-today` tile shows today; `api.pcc.localhost` stays
      **404** (core-api internal).
- [ ] 6.4 Update `CLAUDE.md` (the `calendar` plugin + `radicale` service + `Plugins:Calendar`
      config + first write-path plugin) and the plugin layout; mark tasks complete; ready for
      `/opsx:archive`.
