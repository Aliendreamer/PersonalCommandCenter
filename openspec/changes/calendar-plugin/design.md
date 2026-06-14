## Context

PCC has two read-only plugins (`system`, `iot`) wired through the compile-time `IPlugin` model and
the SSR-BFF (server functions + `_authenticated` loaders; browser talks only to `app.`). `calendar`
is the first **read + write** plugin: it needs a CalDAV backend, iCalendar (VEVENT) mapping, and a
mutation path that still keeps core-api internal. Auth, Traefik, and the SSR-BFF substrate already
exist. Infra already running locally does **not** include CalDAV, so this change also stands one up.

## Goals / Non-Goals

**Goals:**

- A `calendar` plugin matching the `iot`/`system` shape: FastEndpoints under `api/calendar`,
  config-driven activation, graceful `502` degradation, a nav entry + `/calendar` page +
  `calendar-today` tile.
- Full event CRUD (list-by-window / create / update / delete) over CalDAV.
- Establish the **mutation-through-the-SSR-BFF** pattern: `createServerFn({ method: 'POST' })`
  server functions that forward the session cookie; the browser never calls core-api.
- A self-contained **Radicale** CalDAV service in compose, like `keycloak`/`home-assistant`.

**Non-Goals:**

- `tasks` (VTODO), recurring-event expansion (RRULE), invites/attendees, free/busy, multi-calendar
  selection, and timezone-picker UX — all deferred. v1 handles single-calendar VEVENTs with an
  `allDay` flag and ISO start/end.
- Optimistic concurrency (ETag `If-Match`) — v1 is last-write-wins (single user).

## Decisions

- **CalDAV server = Radicale** (vs Nextcloud). Radicale is a tiny pure-Python CalDAV/CardDAV server,
  trivially containerized with htpasswd auth and a file/volume store — matches the self-contained
  harness pattern. Nextcloud is far heavier and only justified once we also want files/notes.
- **iCalendar handling = `Ical.Net`** (vs hand-rolling). VEVENT (DTSTART/DTEND/all-day/escaping/
  folding) is fiddly; `Ical.Net` is the maintained .NET standard. One dependency on the `calendar.api`
  classlib only. Hand-rolling is rejected as fragile under warnings-as-errors.
- **CalDAV interaction = a thin `CalDavClient` over a named `HttpClient`** behind `ICalendarClient`
  (so the host instantiates the endpoint at startup even when disabled, via lazy `Resolve<T>()`, and
  tests inject a fake). Operations against Radicale:
  - **List**: `REPORT` calendar-query with a `VEVENT` time-range filter on the collection → parse the
    returned `calendar-data`. (Fallback if needed: `PROPFIND` depth-1 then `GET` each `.ics`.)
  - **Create/Update**: `PUT` an `.ics` to `{collection}/{uid}.ics` (the resource URL **is** the key).
  - **Delete**: `DELETE {collection}/{uid}.ics`. Unknown uid → upstream `404` mapped to `404`.
  - Auth: HTTP Basic from config; base URL + collection path + credentials from `Plugins:Calendar:*`.
- **`uid` is the resource key.** Create generates a uid (GUID), stores at `{uid}.ics`, returns it;
  update/delete address `{uid}.ics` directly — no list-scan to resolve a uid.
- **Degradation = the IoT contract.** `ICalendarClient` failures (unreachable, unconfigured, parse
  error) surface as `502`; the tile/page render a degraded "Calendar unavailable" state. Validation
  errors (e.g. `end < start`) are `400`; unknown uid is `404`.
- **Mutations through the SSR-BFF.** Read: a `getCalendarEvents` server function feeds the
  `_authenticated/calendar` loader (SSR-with-data) and the tile. Write: `createServerFn({ method:
  'POST' })` functions (`createCalendarEvent`/`updateCalendarEvent`/`deleteCalendarEvent`) forward
  the cookie to `POST/PUT/DELETE api/calendar/events`; on success the component calls
  `router.invalidate()` so the loader re-runs and the view refreshes. core-api stays internal; the
  `[Authorize]`/session check on the endpoints is the real boundary (a route guard is not).
- **Config & secrets.** `Plugins:Calendar:{Enabled,BaseUrl,Collection,Username,Password,WindowDays}`;
  credentials come from the gitignored `.env` (`CALDAV_USER`/`CALDAV_PASSWORD`). Radicale is internal
  to the compose network (no Traefik route) — core-api reaches it as `radicale:5232`.

## Risks / Trade-offs

- **iCalendar edge cases (timezones, all-day, line folding)** → Mitigation: delegate to `Ical.Net`;
  constrain v1 to `allDay` + ISO instants; add client unit tests for round-tripping a VEVENT.
- **Lost updates (no ETag `If-Match`)** → Accepted for single-user v1; note for a future concurrency
  pass. Last-write-wins.
- **CalDAV `REPORT` quirks across servers** → We target Radicale specifically; the `PROPFIND`+`GET`
  fallback is documented if the time-range `REPORT` misbehaves.
- **First write path through the SSR-BFF** → Mitigation: unit-test the mutation server functions like
  the read ones (mock the core-api fetch, assert cookie forwarding + method/body), and assert in E2E
  that a create round-trips and the browser only hit `app.`.
- **New service in compose** → Radicale needs a seeded collection + htpasswd user; document in the
  harness and gate the plugin off cleanly when unconfigured (so the rest of the app is unaffected).
