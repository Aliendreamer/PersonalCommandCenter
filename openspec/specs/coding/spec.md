# coding Specification

## Purpose
TBD - created by archiving change status-board-and-coding. Update Purpose after archive.
## Requirements
### Requirement: Coding-activity endpoint reads the internal Wakapi

The `coding` plugin SHALL expose `GET /api/coding` returning the authenticated user's
coding-activity summary read **server-to-server** from the internal Wakapi instance
(`Plugins:Coding:BaseUrl`, default `http://wakapi:3000`) authenticated with HTTP Basic using the
configured API key (`Plugins:Coding:ApiKey`). The response SHALL include this-week total seconds,
today total seconds, a per-day breakdown for the week, and top projects and languages by seconds.

#### Scenario: Returns the weekly coding summary

- **WHEN** an authenticated user requests `GET /api/coding` and Wakapi is reachable
- **THEN** the endpoint returns `200` with this-week total, today total, per-day breakdown, and
  project and language lists

#### Scenario: Zero-activity week is healthy

- **WHEN** Wakapi is reachable but the user has recorded no activity this week
- **THEN** the endpoint returns `200` with zero totals and empty breakdown lists (not an error)

### Requirement: Coding endpoint degrades to 502

The `coding` endpoint SHALL return `502 Bad Gateway` when the Wakapi instance is unreachable or the
plugin is misconfigured (missing API key), so the dashboard tile degrades without breaking the page.

#### Scenario: Wakapi unreachable

- **WHEN** the configured Wakapi host cannot be reached
- **THEN** `GET /api/coding` returns `502`

#### Scenario: API key not configured

- **WHEN** `Plugins:Coding:ApiKey` is empty
- **THEN** `GET /api/coding` returns `502`

### Requirement: Coding plugin is compile-time registered and toggleable

The `coding` plugin SHALL be an `IPlugin` with manifest `("coding", "Coding", "/coding",
["coding-status"])`, activated only when `Plugins:Coding:Enabled` is `true`, and its endpoint SHALL
require authentication like other plugin endpoints.

#### Scenario: Disabled plugin is inactive

- **WHEN** `Plugins:Coding:Enabled` is `false`
- **THEN** the `coding` manifest is absent from `GET /api/plugins` and `GET /api/coding` is not served

#### Scenario: Enabled plugin appears in the manifest

- **WHEN** `Plugins:Coding:Enabled` is `true`
- **THEN** `GET /api/plugins` includes the `coding` manifest with the `coding-status` widget

### Requirement: Coding dashboard tile and page

The web shell SHALL render a `coding-status` dashboard tile showing this-week total as the headline
and today total as a secondary line, and a `/coding` page showing the this-week total, the per-day
strip, and project and language breakdowns. Both SHALL be server-rendered with data and degrade to a
non-blocking notice when the source errors.

#### Scenario: Tile shows week and today totals

- **WHEN** the dashboard loads and `GET /api/coding` succeeds
- **THEN** the coding tile shows the formatted this-week total and the today total

#### Scenario: Tile degrades on source error

- **WHEN** `GET /api/coding` returns an error
- **THEN** the coding tile shows a non-blocking degraded notice and the rest of the dashboard renders

#### Scenario: Page shows the weekly breakdown

- **WHEN** the user navigates to `/coding` and the source succeeds
- **THEN** the page shows the this-week total, a per-day breakdown, and project and language lists

### Requirement: Coding endpoint supports week/month/year ranges

`GET /api/coding` SHALL accept a `range` query parameter of `week`, `month`, or `year` (defaulting to
`week` when absent or invalid) and return the coding-activity summary for that range from Wakapi. The
response SHALL include the range, the range total seconds, today's seconds, and a per-day list.

#### Scenario: Month range is returned

- **WHEN** an authenticated user requests `GET /api/coding?range=month`
- **THEN** the response's range is `month` and its total + per-day list cover the month

#### Scenario: Absent or invalid range defaults to week

- **WHEN** `GET /api/coding` is requested with no `range` (or an unrecognized one)
- **THEN** the response is the `week` range

### Requirement: Coding response carries per-day breakdowns

Each day in the coding response SHALL carry its own projects and languages breakdown (in addition to
the range-aggregated breakdowns), so a single day's activity can be shown without another request.

#### Scenario: A day includes its own breakdown

- **WHEN** the coding response is returned for a range
- **THEN** each day entry includes that day's date, total seconds, projects, and languages

### Requirement: Coding page selects range and filters by day

The `/coding` page SHALL let the user choose the range (week/month/year), reloading the data, and SHALL
present a clickable per-day chart. Selecting a day SHALL filter the projects and languages breakdowns to
that day; clearing the selection SHALL restore the whole-range breakdown.

#### Scenario: Switching range reloads the page

- **WHEN** the user selects the "Month" range
- **THEN** the page reloads the coding data for the month and the heading reflects the month total

#### Scenario: Clicking a day filters the breakdown

- **WHEN** the user clicks a day in the per-day chart
- **THEN** the projects and languages sections show that day's breakdown, and the day is highlighted

#### Scenario: Clearing the day restores the range

- **WHEN** a day is selected and the user clears the selection
- **THEN** the projects and languages sections show the whole-range breakdown again

