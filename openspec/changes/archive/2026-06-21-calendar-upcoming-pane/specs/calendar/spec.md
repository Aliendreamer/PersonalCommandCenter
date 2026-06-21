## MODIFIED Requirements

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
