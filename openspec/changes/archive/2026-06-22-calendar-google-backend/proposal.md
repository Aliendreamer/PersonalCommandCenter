## Why

PCC's calendar is its own isolated Radicale (CalDAV) store — it only shows events created in PCC, so
your real Google Calendar plans never appear. You want PCC to read **and** write your Google Calendar
directly, merged with PCC's own events, so the calendar + Upcoming list reflect your actual schedule.

## What Changes

Extend the existing `calendar` plugin with a **Google Calendar backend** (read+write), aggregated with
the current CalDAV/Radicale backend. Each event lives in exactly one place (PCC's Radicale **or**
Google); there is **no mirroring/sync** between them — PCC is simply a client of both.

- **Credentials come from config** (your decision): the Google OAuth **client id, client secret, and a
  long-lived refresh token** are supplied via `.env` (PCC's secret convention), with a
  `Plugins:Calendar:Google:Enabled` flag in `appsettings.json`. There is **no in-app OAuth "Connect"
  flow, no callback, and no token-storage entity** — PCC mints access tokens from your refresh token
  and calls the Google Calendar API. (You obtain the refresh token once, externally — e.g. the Google
  OAuth Playground — with the Calendar scope.)
- **Read (merged):** a `GoogleCalendarClient` lists your **primary** Google calendar for the same date
  windows the page uses, with `singleEvents=true` so recurring events arrive **pre-expanded as
  instances** (no RRULE parsing). The plugin merges Radicale + Google events, each tagged with a
  `source` (`pcc` | `google`).
- **Write (full CRUD, routed by source):** create/edit/delete act on the event's own calendar — Google
  events via the API, PCC events via CalDAV. The create form gains a **calendar selector** (PCC /
  Google) when Google is enabled; Google writes create single (non-recurring) events.
- **Degradation:** if Google is unconfigured, the token is revoked/expired, or the API errors, Google
  events simply drop out (Radicale events still render) with a "Google unavailable" notice — the merged
  listing is **not** failed unless *both* sources fail.

## Capabilities

### Modified Capabilities
- `calendar`: the plugin reads+writes a Google Calendar backend (config-credentialed, primary calendar,
  full CRUD) merged with the existing CalDAV backend; events carry a `source`; writes route by source.

## Non-goals

- Multiple Google calendars (primary only; a calendar picker is a clean follow-up).
- Two-way mirroring/sync between Radicale and Google (each event lives in one store).
- An in-app Google OAuth linking flow / consent UI (credentials are config-supplied).
- Recurrence authoring (Google writes are single events; recurring Google events are read-only instances).

## Impact

- **.NET (`plugins/calendar`)**: `GoogleCalendarClient` (token refresh + Calendar API CRUD); a source-aware
  aggregator behind `ICalendarClient`; endpoints return `source` and route writes by source; new
  `CalendarOptions.Google` (`Enabled`, `ClientId`, `ClientSecret`, `RefreshToken`).
- **Contracts**: `CalendarEvent` gains `source`; the create input gains an optional target `calendar`.
- **Web**: source badge on events; a calendar selector on the create form (when Google enabled); the
  degraded-Google notice.
- **Config**: `Plugins:Calendar:Google:Enabled` in `appsettings.json`; `Plugins__Calendar__Google__ClientId`
  / `__ClientSecret` / `__RefreshToken` in `.env`.
- **Tests**: `GoogleCalendarClient` (token refresh, range read w/ recurrence instances, CRUD), the merge
  + source-tagging, write-routing, the form selector. No infra/container change.

See `design.md` for the detailed architecture.
