import type { CalendarEvent } from '@pcc/contracts'

export interface CalendarEventListProps {
  events: CalendarEvent[]
  error?: string
  /** Optional write actions (wired by the page in the write-path phase). */
  onEdit?: (event: CalendarEvent) => void
  onDelete?: (event: CalendarEvent) => void
}

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function timeLabel(event: CalendarEvent): string {
  if (event.allDay) {
    return 'All day'
  }
  return new Date(event.start).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Lists calendar events grouped by day; degrades on error. */
export function CalendarEventList({
  events,
  error,
  onEdit,
  onDelete,
}: CalendarEventListProps) {
  if (error) {
    return (
      <p role="status" className="text-sm text-warning">
        Calendar unavailable
      </p>
    )
  }

  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No upcoming events</p>
  }

  const byDay = new Map<string, CalendarEvent[]>()
  for (const event of [...events].sort((a, b) =>
    a.start.localeCompare(b.start),
  )) {
    const key = new Date(event.start).toDateString()
    const list = byDay.get(key) ?? []
    list.push(event)
    byDay.set(key, list)
  }

  return (
    <div className="space-y-6">
      {[...byDay.values()].map((list) => (
        <section
          key={list[0].start}
          data-testid={`day-${new Date(list[0].start).toDateString()}`}
        >
          <h3 className="mb-2 font-semibold">{dayLabel(list[0].start)}</h3>
          <ul className="divide-y rounded border">
            {list.map((event) => (
              <li
                key={event.uid}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <span className="truncate">
                  <span className="text-muted-foreground">
                    {timeLabel(event)}
                  </span>{' '}
                  {event.title}
                </span>
                {(onEdit || onDelete) && (
                  <span className="flex shrink-0 gap-2">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(event)}
                        className="underline"
                      >
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(event)}
                        className="text-danger underline"
                      >
                        Delete
                      </button>
                    )}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
