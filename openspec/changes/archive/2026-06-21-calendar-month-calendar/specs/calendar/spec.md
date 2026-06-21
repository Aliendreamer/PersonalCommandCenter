## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Interactive month calendar UI

The `/calendar` page SHALL present a two-pane layout: an interactive month-calendar grid and a panel
showing the selected day's events. The grid SHALL mark days that have events, SHALL let the user select
a day to see that day's events, and SHALL support navigating across months and years (previous/next
month and previous/next year), re-deriving the visible grid for the chosen month. The page SHALL remain
server-rendered with the initial month's events (no client-only loading state), and all reads SHALL go
through the SSR server.

#### Scenario: Month grid marks days with events

- **WHEN** the `/calendar` page renders a month in which some days have events
- **THEN** the grid shows a marker on each day that has at least one event

#### Scenario: Selecting a day shows its events

- **WHEN** the user selects a day in the month grid
- **THEN** the detail pane lists that day's events (or an empty state)

#### Scenario: Navigating months and years re-derives the grid

- **WHEN** the user navigates to the previous/next month or previous/next year
- **THEN** the grid re-renders for the chosen month with that month's day layout and event markers
