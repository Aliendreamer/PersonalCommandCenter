## ADDED Requirements

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
