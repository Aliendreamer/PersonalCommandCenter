## Why

> Retroactive spec — the work shipped directly to `main` (commits `afcc008`, `9f628a7`, `d229132`)
> ahead of its proposal. Captured here to keep the `calendar` spec the source of truth.

The `/calendar` page was a flat list. Users want a real month calendar to see the shape of the month
at a glance and to navigate across months/years, with the days that have events visibly marked. The
flat-list page also only fetched a "today + N days" window, which can't fill a month grid.

## What Changes

- **`GET /api/calendar/events` accepts an explicit date-range window** via `from`/`to` query params,
  so the page can ask for exactly the visible month (± padding) instead of only "today + N days". The
  existing `days` behavior remains the default when no range is given.
- **The `/calendar` page becomes a two-pane layout:** an interactive month-calendar grid on one side
  and the day's event detail/list on the other. Days that have events show a marker (dot); selecting a
  day shows that day's events.
- **The month calendar supports month and year navigation** (prev/next month and prev/next year),
  re-deriving the visible grid.

## Capabilities

### Modified Capabilities
- `calendar`: the listing endpoint accepts an explicit `from`/`to` window; the UI gains an interactive
  two-pane month calendar with month/year navigation and per-day event markers.

## Impact

- **.NET**: `CalDavClient` date-range REPORT (`time-range` with `from`/`to`); `ICalendarClient` /
  `CalendarPlugin` listing endpoint reads `from`/`to`; `CalendarOptions`.
- **Web**: `routes/_authenticated/calendar.tsx` (two-pane loader window), `components/calendar-month.tsx`
  (month grid + navigation), `components/calendar-event-list.tsx`.
- **Tests**: `CalDavClientTests`, `CalendarEndpointTests`, `calendar-month` / `calendar-event-list`
  component tests.
