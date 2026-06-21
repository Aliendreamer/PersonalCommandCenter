# calendar Specification

## Purpose
TBD - created by archiving change calendar-plugin. Update Purpose after archive.
## Requirements
### Requirement: Calendar event listing

The `calendar` plugin SHALL fetch VEVENT items from the configured CalDAV collection for a
time window and expose them at `GET /api/calendar/events`, mapped to
`{ uid, title, start, end, allDay, location?, description? }` and sorted by `start`. The window
SHALL default to today plus a configured number of upcoming days and SHALL be overridable either via a
`days` query parameter or via an explicit `from`/`to` date range (used by the month calendar to fetch
the visible month). When `from`/`to` are supplied they take precedence over `days`.

#### Scenario: Returns mapped events in the window

- **WHEN** the CalDAV collection holds a VEVENT today and one outside the window, and a client
  requests `GET /api/calendar/events`
- **THEN** the response contains the in-window event mapped with `uid`, `title`, `start`, `end`,
  and `allDay`, and omits the out-of-window event

#### Scenario: Window is overridable by days

- **WHEN** a client requests `GET /api/calendar/events?days=1`
- **THEN** only events whose start falls within today are returned

#### Scenario: Window is overridable by an explicit date range

- **WHEN** a client requests `GET /api/calendar/events?from=2026-06-01&to=2026-07-01`
- **THEN** only events whose start falls within that range are returned (so the month grid can show the
  visible month's events)

### Requirement: Create calendar event

The `calendar` plugin SHALL accept `POST /api/calendar/events` with
`{ title, start, end, allDay?, location?, description? }`, write a VEVENT to the CalDAV
collection, and return the created event including its server-addressable `uid`.

#### Scenario: Created event is persisted

- **WHEN** a client POSTs a valid event
- **THEN** the response is `201` with the created event (including a `uid`), and a subsequent
  `GET /api/calendar/events` for the same window includes it

#### Scenario: Invalid event is rejected

- **WHEN** a client POSTs an event whose `end` precedes its `start`
- **THEN** the response is `400` and nothing is written to CalDAV

### Requirement: Update calendar event

The `calendar` plugin SHALL accept `PUT /api/calendar/events/{uid}` and update the matching
VEVENT's fields in the CalDAV collection.

#### Scenario: Update changes the stored event

- **WHEN** a client PUTs a new title for an existing event's `uid`
- **THEN** the response is `200` and a subsequent listing shows the updated title

#### Scenario: Unknown uid

- **WHEN** a client PUTs to a `uid` that does not exist
- **THEN** the response is `404`

### Requirement: Delete calendar event

The `calendar` plugin SHALL accept `DELETE /api/calendar/events/{uid}` and remove the matching
VEVENT from the CalDAV collection.

#### Scenario: Delete removes the event

- **WHEN** a client DELETEs an existing event's `uid`
- **THEN** the response is `204` and a subsequent listing no longer includes it

#### Scenario: Unknown uid

- **WHEN** a client DELETEs a `uid` that does not exist
- **THEN** the response is `404`

### Requirement: Config-driven activation

The `calendar` plugin SHALL activate only when `Plugins:Calendar:Enabled` is `true`, and SHALL
appear in `/api/plugins` with a "Calendar" nav entry and `calendar-today` widget when enabled.

#### Scenario: Disabled plugin is absent

- **WHEN** the core starts with `Plugins:Calendar:Enabled = false`
- **THEN** the `api/calendar/*` endpoints are not served and `calendar` is absent from
  `/api/plugins`

### Requirement: Graceful degradation on CalDAV failure

When the CalDAV server is unreachable or not configured, the `calendar` plugin's endpoints SHALL
respond with a non-success status (`502`), and the UI SHALL show a degraded state without
breaking the dashboard.

#### Scenario: CalDAV unreachable

- **WHEN** the CalDAV request fails or no CalDAV base URL/credentials are configured
- **THEN** `GET /api/calendar/events` responds with `502` and the Calendar tile/page show a
  degraded state rather than crashing

### Requirement: Calendar UI surfaces (read + write via the SSR-BFF)

The `calendar` plugin SHALL contribute a "Calendar" nav entry, a `/calendar` page that is
server-rendered with events and supports create/edit/delete, and a `calendar-today` dashboard
tile showing today's events. All reads and writes SHALL go through the SSR server (server
functions) — the browser SHALL NOT call core-api directly — and after a successful write the
affected view SHALL refresh.

#### Scenario: Calendar page is server-rendered with events

- **WHEN** the `/calendar` page is requested with events available
- **THEN** the server-rendered HTML already lists the events (no client-only loading state)

#### Scenario: Today tile shows today's events

- **WHEN** the dashboard renders with the `calendar` plugin enabled and events available
- **THEN** the `calendar-today` tile shows today's events (or an empty state), degrading to a
  "Calendar unavailable" state on error

#### Scenario: Creating an event from the UI refreshes the view

- **WHEN** the user creates an event from the `/calendar` page
- **THEN** the create goes through an SSR server function (the browser only talks to the app
  origin) and the page refreshes to include the new event

### Requirement: Interactive month calendar UI

The `/calendar` page SHALL present a two-pane layout: an interactive month-calendar grid in a narrower
left column and, in the wider right column, a list of all **upcoming events** (events from the start of
today onward, ascending, grouped by day with date headers). The grid SHALL mark days that have events,
SHALL let the user select a day (which seeds creating an event on that day and highlights it), and SHALL
support navigating across months and years (previous/next month and previous/next year), re-deriving the
visible grid. The upcoming list SHALL be anchored to today (stable as the user navigates months), not to
the selected day. The page SHALL remain server-rendered with events present, and all reads SHALL go
through the SSR server.

#### Scenario: Month grid marks days with events

- **WHEN** the `/calendar` page renders a month in which some days have events
- **THEN** the grid shows a marker on each day that has at least one event

#### Scenario: Upcoming events are listed beside the calendar

- **WHEN** the page renders and there are events dated after today (e.g. today is 21 Jun and an event
  is on 2 Jul)
- **THEN** the right pane lists those future events grouped by day, regardless of which day is selected

#### Scenario: Selecting a day seeds creating an event there

- **WHEN** the user selects a day in the month grid and adds an event
- **THEN** the create form is seeded to that day and the day is highlighted in the grid

#### Scenario: Navigating months and years re-derives the grid

- **WHEN** the user navigates to the previous/next month or previous/next year
- **THEN** the grid re-renders for the chosen month, while the upcoming list (anchored to today) is unchanged

