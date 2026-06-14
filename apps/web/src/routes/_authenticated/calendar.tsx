import { createFileRoute } from '@tanstack/react-router'

import { getCalendarEvents } from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { CalendarEventList } from '../../components/calendar-event-list'

export const Route = createFileRoute('/_authenticated/calendar')({
  loader: async () => settle(getCalendarEvents()),
  component: CalendarPage,
})

function CalendarPage() {
  const events = Route.useLoaderData()
  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-semibold">Calendar</h1>
      <CalendarEventList
        events={events.data ?? []}
        error={events.error ? 'unreachable' : undefined}
      />
    </div>
  )
}
