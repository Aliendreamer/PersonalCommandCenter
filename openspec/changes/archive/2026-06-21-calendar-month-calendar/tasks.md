## 1. Backend date-range listing (TDD)

- [x] 1.1 `CalDavClientTests` / `CalendarEndpointTests`: `GET /api/calendar/events?from=…&to=…` returns
  events in that window; no range → existing `days` default
- [x] 1.2 `CalDavClient` builds the CalDAV `time-range` from `from`/`to`; endpoint reads the params

## 2. Month-calendar UI (TDD)

- [x] 2.1 `calendar-month` test: renders a month grid, marks days with events, selecting a day surfaces
  its events; month/year navigation re-derives the grid
- [x] 2.2 `calendar-month.tsx` (grid + prev/next month + prev/next year) and the two-pane
  `calendar.tsx` page; `calendar-event-list.tsx` shows the selected day

## 3. Gates

- [x] 3.1 `dotnet build`/`test`/`format`, `pnpm typecheck`/`lint`/`test`/`build`/`format:check` green
