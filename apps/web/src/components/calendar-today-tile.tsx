import type { CalendarEvent } from '@pcc/contracts'

export interface CalendarTodayTileProps {
  /** Provided by the route loader (SSR-with-data); absent when the source is degraded. */
  events?: CalendarEvent[]
  error?: boolean
}

function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString()
}

function formatTime(event: CalendarEvent): string {
  if (event.allDay) {
    return 'All day'
  }
  return new Date(event.start).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Dashboard tile listing today's events, with a degraded state when unavailable. */
export function CalendarTodayTile({ events, error }: CalendarTodayTileProps) {
  if (error || !events) {
    return (
      <p role="status" className="text-sm text-warning">
        Calendar unavailable
      </p>
    )
  }

  const today = events.filter((event) => isToday(event.start))
  if (today.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing today</p>
  }

  return (
    <ul className="space-y-1 text-sm">
      {today.map((event) => (
        <li key={event.uid} className="flex justify-between gap-2">
          <span className="truncate">{event.title}</span>
          <span className="shrink-0 text-muted-foreground">
            {formatTime(event)}
          </span>
        </li>
      ))}
    </ul>
  )
}
