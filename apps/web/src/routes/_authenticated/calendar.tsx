import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import type { CalendarEvent, CalendarEventInput } from '@pcc/contracts'

import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvents,
  updateCalendarEvent,
} from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { CalendarEventList } from '../../components/calendar-event-list'
import { CalendarEventForm } from '../../components/calendar-event-form'

export const Route = createFileRoute('/_authenticated/calendar')({
  loader: async () => settle(getCalendarEvents()),
  component: CalendarPage,
})

type Editor =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; event: CalendarEvent }

function CalendarPage() {
  const events = Route.useLoaderData()
  const router = useRouter()
  const [editor, setEditor] = useState<Editor>({ mode: 'closed' })

  async function refresh() {
    setEditor({ mode: 'closed' })
    await router.invalidate()
  }

  async function onCreate(input: CalendarEventInput) {
    await createCalendarEvent({ data: input })
    await refresh()
  }

  async function onUpdate(uid: string, input: CalendarEventInput) {
    await updateCalendarEvent({ data: { uid, event: input } })
    await refresh()
  }

  async function onDelete(event: CalendarEvent) {
    await deleteCalendarEvent({ data: event.uid })
    await refresh()
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Calendar</h1>
        {editor.mode === 'closed' && (
          <button
            type="button"
            onClick={() => setEditor({ mode: 'create' })}
            className="rounded bg-gray-900 px-3 py-1 text-sm text-white"
          >
            New event
          </button>
        )}
      </div>

      {editor.mode === 'create' && (
        <CalendarEventForm
          submitLabel="Create"
          onSubmit={onCreate}
          onCancel={() => setEditor({ mode: 'closed' })}
        />
      )}
      {editor.mode === 'edit' && (
        <CalendarEventForm
          submitLabel="Update"
          initial={editor.event}
          onSubmit={(input) => onUpdate(editor.event.uid, input)}
          onCancel={() => setEditor({ mode: 'closed' })}
        />
      )}

      <CalendarEventList
        events={events.data ?? []}
        error={events.error ? 'unreachable' : undefined}
        onEdit={(event) => setEditor({ mode: 'edit', event })}
        onDelete={onDelete}
      />
    </div>
  )
}
