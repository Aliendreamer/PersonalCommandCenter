import type { CalendarEvent } from '@pcc/contracts'

/**
 * The upcoming events to show beside the calendar: everything from the start of `now`'s day onward
 * (so today's earlier events still count), sorted ascending by start. Anchored to today, not to the
 * selected day, so the list is stable as the user navigates months.
 */
export function upcomingEvents(
  events: CalendarEvent[],
  now: Date,
): CalendarEvent[] {
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime()
  return events
    .filter((event) => new Date(event.start).getTime() >= startOfToday)
    .sort((a, b) => a.start.localeCompare(b.start))
}
