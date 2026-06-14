## ADDED Requirements

### Requirement: Calendar event listing

The `calendar` plugin SHALL fetch VEVENT items from the configured CalDAV collection for a
time window and expose them at `GET /api/calendar/events`, mapped to
`{ uid, title, start, end, allDay, location?, description? }` and sorted by `start`. The window
SHALL default to today plus a configured number of upcoming days and SHALL be overridable via a
`days` query parameter.

#### Scenario: Returns mapped events in the window

- **WHEN** the CalDAV collection holds a VEVENT today and one outside the window, and a client
  requests `GET /api/calendar/events`
- **THEN** the response contains the in-window event mapped with `uid`, `title`, `start`, `end`,
  and `allDay`, and omits the out-of-window event

#### Scenario: Window is overridable

- **WHEN** a client requests `GET /api/calendar/events?days=1`
- **THEN** only events whose start falls within today are returned

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
