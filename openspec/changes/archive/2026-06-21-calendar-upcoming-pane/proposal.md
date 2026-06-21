## Why

The calendar page's right pane only shows the **selected day's** events. So if today is 21 Jun and you
have something planned for 2 Jul, you can't see it without clicking to that day. You want all your
**upcoming events** visible at a glance next to the calendar.

## What Changes

- **The right pane becomes an "Upcoming" list of all future events** (from today onward, ascending,
  grouped by day with date headers) instead of only the selected day's events. It reuses the existing
  `CalendarEventList` (which already groups by day) with edit/delete intact.
- **The layout shifts the calendar left**: an asymmetric two-column grid — the month calendar in a
  narrower left column, the wider upcoming list on the right.
- **The loader also fetches a forward window anchored to today** (today → +12 months), independent of
  the viewed month, so the upcoming list is stable as you navigate months. The month-window fetch (for
  the grid's event dots) is unchanged.
- **Add/edit still works**: clicking a date selects it and seeds "Add event" on that day; the calendar
  still highlights the selected day. This is a FE-only change — the CalDAV range endpoint already
  supports `from`/`to`.

## Capabilities

### Modified Capabilities
- `calendar`: the `/calendar` page shows an upcoming-events list (all future events) beside a
  left-shifted month calendar, replacing the selected-day-only right pane.

## Impact

- **Web**: `routes/_authenticated/calendar.tsx` (second forward fetch; asymmetric `Grid`; right pane
  renders upcoming events); a small `lib/calendar.ts` `upcomingEvents(events, now)` helper.
- **Tests**: `lib/calendar` (filters to future + ascending); existing `CalendarEventList` tests cover
  the grouped rendering.
- No backend/contract change.
