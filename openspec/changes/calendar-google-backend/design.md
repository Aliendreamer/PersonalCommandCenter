# Design — Google Calendar backend for the calendar plugin

## Context

The `calendar` plugin today has one backend: `CalDavClient` (Radicale), behind `ICalendarClient`
(`ListAsync(from,to)`, `CreateAsync`, `UpdateAsync(uid)`, `DeleteAsync(uid)`). The `/calendar` page +
the dashboard tile consume `GET/POST/PUT/DELETE /api/calendar/events`. We add Google as a **second
read+write backend**, merged. No mirroring: an event lives in exactly one store.

## Credentials (config-only — no OAuth UI)

The operator supplies, in `.env` (PCC's secret form):

```
Plugins__Calendar__Google__ClientId=...
Plugins__Calendar__Google__ClientSecret=...
Plugins__Calendar__Google__RefreshToken=...     # obtained once, externally, with the Calendar scope
```

and `appsettings.json` carries `Plugins:Calendar:Google:Enabled` (default `false`). These bind to a new
`GoogleOptions` nested under `CalendarOptions`. When `Enabled` is false or any secret is blank, the
Google backend is inert (CalDAV-only behaviour, unchanged from today).

`GoogleCalendarClient` exchanges the refresh token for a short-lived access token at
`https://oauth2.googleapis.com/token` (`grant_type=refresh_token`), **caches it in-memory** until ~60s
before expiry, and sends it as a bearer to the Calendar API. No token is persisted (the refresh token
in config is the durable credential).

## Components

```
ICalendarClient (existing interface)
  └── AggregateCalendarClient   ← the plugin now resolves THIS
        ├── CalDavClient        (source = "pcc")
        └── GoogleCalendarClient (source = "google", only when Google is enabled)
```

- **GoogleCalendarClient : ICalendarSourceClient** — talks to
  `https://www.googleapis.com/calendar/v3/calendars/primary/events`:
  - `ListAsync(from,to)`: `GET …/events?timeMin&timeMax&singleEvents=true&orderBy=startTime` →
    recurring events arrive **expanded as instances** (no RRULE parsing). Maps Google's
    `{id, summary, start{dateTime|date}, end, location, description}` → `CalendarEvent` with
    `source="google"`, `uid = google event id`. All-day = `start.date` present.
  - `CreateAsync` → `POST …/events`; `UpdateAsync(id)` → `PATCH …/events/{id}`;
    `DeleteAsync(id)` → `DELETE …/events/{id}`.
- **AggregateCalendarClient : ICalendarClient** — the new façade the endpoints resolve:
  - `ListAsync`: calls each enabled source, **settles each independently**, concatenates the
    successes sorted by start. If a source throws, its events are dropped and a per-source degraded
    flag is recorded; only when **every** source fails does `ListAsync` surface failure (→ 502).
  - Writes are **routed by source** (below).

`ICalendarSourceClient` is the per-backend contract (`Source`, `ListAsync`, `CreateAsync`,
`UpdateAsync`, `DeleteAsync`). `CalDavClient` implements it with `Source="pcc"`.

## Endpoints / contracts

- `CalendarEvent` gains **`source: "pcc" | "google"`** (TS contract + .NET record).
- **List** `GET /api/calendar/events` (and the range variant): returns merged events, each with its
  `source`. Response is `200` with whatever sources succeeded; `502` only if all fail. A partial
  failure is still `200` (the page shows a degraded notice for the failed source).
- **Create** `POST /api/calendar/events`: the input gains an optional **`calendar: "pcc" | "google"`**
  (default `"pcc"`); the aggregate routes the create to that backend and returns the created event with
  its `source`.
- **Update** `PUT /api/calendar/events/{uid}` and **Delete** `DELETE …/{uid}`: carry the **`source`**
  (query param `?source=google`, supplied by the UI from the listed event) so the aggregate routes to
  the owning backend. Unknown/!found → `404`; a source-specific failure → `502`.

`uid` namespaces don't collide in practice (CalDAV uses our GUIDs, Google uses its own ids), but the
explicit `source` makes routing unambiguous rather than guessing.

## Web

- Each event row/cell shows a small **source badge/colour** (`PCC` vs `Google`) so you can tell them
  apart in the calendar grid dots, the Upcoming list, and the day cells.
- The **create form gains a "Calendar" selector** (PCC / Google), shown only when Google is enabled
  (surfaced via the plugin manifest or a `googleEnabled` flag on the loader payload). Edit/Delete read
  the event's `source` and pass it to the mutation.
- The existing server-fn mutations (`createCalendarEvent`/`update`/`delete`) pass `calendar`/`source`
  through to core-api. Degraded-Google → a non-blocking "Google calendar unavailable" notice; the page
  still renders PCC events.

## Recurrence & timezones

- **Read**: `singleEvents=true` means Google returns concrete instances — recurring events Just Work as
  read-only instances; no RRULE handling needed.
- **Write**: PCC creates **single** events only (no recurrence UI). Times are sent/[parsed] as RFC3339
  with offsets; we treat Google `dateTime` as the instant it carries (consistent with the app's
  existing UTC-leaning handling; full TZID is still a non-goal).

## Error handling

| Situation | Behaviour |
|---|---|
| Google disabled / secrets blank | Google backend inert; CalDAV-only (today's behaviour) |
| Refresh-token invalid / token endpoint 4xx | Google source degrades (dropped from the merge + notice); never 502s the listing if CalDAV is up |
| Google API 5xx / network | Same — degrade Google, keep PCC events |
| Both sources fail | `ListAsync` → `502` (the whole calendar is genuinely down) |
| Write to a source that fails | `502` for that mutation (the user can retry) |

## Testing (TDD)

- `GoogleCalendarClientTests`: refresh-token → access-token exchange (stubbed token endpoint, cached);
  range list maps instances incl. an expanded recurring event + all-day; create/update/delete hit the
  right verbs/URLs; a 401 from the API surfaces as a source failure.
- `AggregateCalendarClientTests`: merges both sources sorted by start + tags `source`; one source
  failing degrades (returns the other) while both failing throws; writes route by source.
- `CalendarEndpointTests`: list returns `source`; create honours `calendar`; update/delete route by
  `?source`; partial degrade is `200`, total failure `502`.
- Web: event source badge renders; create-form calendar selector appears only when Google is enabled
  and submits the chosen target; degraded-Google notice.

## Rollout

FE+BE change, no new container. Ship behind `Plugins:Calendar:Google:Enabled=false` by default; the
operator enables it after putting the three secrets in `.env`. Existing CalDAV-only behaviour is
unchanged when Google is off.
