import { useState } from 'react'
import type { CalendarEvent, CalendarEventInput } from '@pcc/contracts'

export interface CalendarEventFormProps {
  onSubmit: (input: CalendarEventInput) => void
  onCancel?: () => void
  /** When provided, the form edits this event (fields pre-filled). */
  initial?: CalendarEvent
  submitLabel?: string
}

// <input type="datetime-local"> wants `YYYY-MM-DDTHH:mm` in local time.
function toLocalInput(iso: string | undefined): string {
  if (!iso) {
    return ''
  }
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Create/edit form for a calendar event. Presentational — the page wires `onSubmit` to a mutation. */
export function CalendarEventForm({
  onSubmit,
  onCancel,
  initial,
  submitLabel = 'Save',
}: CalendarEventFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [start, setStart] = useState(toLocalInput(initial?.start))
  const [end, setEnd] = useState(toLocalInput(initial?.end))
  const [allDay, setAllDay] = useState(initial?.allDay ?? false)
  const [location, setLocation] = useState(initial?.location ?? '')

  return (
    <form
      className="mb-6 grid max-w-md gap-2 rounded border p-4"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({
          title,
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          allDay,
          location: location || undefined,
        })
      }}
    >
      <label className="grid gap-1 text-sm">
        Title
        <input
          required
          aria-label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded border px-2 py-1"
        />
      </label>
      <label className="grid gap-1 text-sm">
        Start
        <input
          required
          type="datetime-local"
          aria-label="Start"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="rounded border px-2 py-1"
        />
      </label>
      <label className="grid gap-1 text-sm">
        End
        <input
          required
          type="datetime-local"
          aria-label="End"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="rounded border px-2 py-1"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          aria-label="All day"
          checked={allDay}
          onChange={(e) => setAllDay(e.target.checked)}
        />
        All day
      </label>
      <label className="grid gap-1 text-sm">
        Location
        <input
          aria-label="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="rounded border px-2 py-1"
        />
      </label>
      <div className="mt-2 flex gap-2">
        <button
          type="submit"
          className="rounded bg-foreground px-3 py-1 text-sm text-background"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 text-sm underline"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
