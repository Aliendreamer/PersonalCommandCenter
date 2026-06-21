import { useEffect, useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import {
  Box,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { Plus } from 'lucide-react'
import type { CalendarEvent, CalendarEventInput } from '@pcc/contracts'

import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEventsRange,
  updateCalendarEvent,
} from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { CalendarMonth } from '../../components/calendar-month'
import { CalendarEventList } from '../../components/calendar-event-list'
import { CalendarEventForm } from '../../components/calendar-event-form'
import { PluginPage } from '../../components/plugin-page'

// The viewed month is JSON-validated search-param state (`year`/`month`, month 1-12) so the loader
// refetches the visible month's events as the user navigates — even across years. Absent/invalid
// params fall back to the current month (resolved server-side, so SSR matches the URL default).
interface CalendarSearch {
  year: number
  month: number
}

function isMonth(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 12
  )
}

function isYear(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1970 &&
    value <= 9999
  )
}

export const Route = createFileRoute('/_authenticated/calendar')({
  validateSearch: (search: Record<string, unknown>): CalendarSearch => {
    const now = new Date()
    return {
      year: isYear(search.year) ? search.year : now.getFullYear(),
      month: isMonth(search.month) ? search.month : now.getMonth() + 1,
    }
  },
  loaderDeps: ({ search: { year, month } }) => ({ year, month }),
  // Load a browsing window (previous month through +1 month around the viewed month) so the grid can
  // show event dots for the visible month plus a little context, refetched as the user navigates.
  loader: async ({ deps: { year, month } }) => {
    const from = new Date(year, month - 2, 1)
    const to = new Date(year, month + 1, 1)
    return settle(
      getCalendarEventsRange({
        data: { from: from.toISOString(), to: to.toISOString() },
      }),
    )
  },
  component: CalendarPage,
})

type Editor =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; event: CalendarEvent }

const cardBorder =
  '2px solid light-dark(var(--mantine-color-gray-5), var(--mantine-color-dark-3))'

function sameDay(a: string | Date, b: Date): boolean {
  return new Date(a).toDateString() === b.toDateString()
}

function CalendarPage() {
  const events = Route.useLoaderData()
  const { year, month: monthNum } = Route.useSearch()
  const navigate = Route.useNavigate()
  const router = useRouter()

  // The viewed month is driven by the URL search params, so SSR + the refetched loader stay
  // consistent and year navigation refetches the visible window (the 1st of the viewed month).
  const month = new Date(year, monthNum - 1, 1)

  // `today`/`selected` are resolved on the client (after mount) so SSR/local-timezone differences
  // can't cause a hydration mismatch in the "today"/selected highlighting — mirrors the hero clock.
  const [today, setToday] = useState<Date | null>(null)
  const [selected, setSelected] = useState<Date | null>(null)
  const [editor, setEditor] = useState<Editor>({ mode: 'closed' })

  useEffect(() => {
    const now = new Date()
    setToday(now)
    setSelected(now)
  }, [])

  // Navigate the viewed month through the URL so the loader refetches that month's window.
  function goToMonth(target: Date) {
    void navigate({
      search: { year: target.getFullYear(), month: target.getMonth() + 1 },
    })
  }

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

  function selectDay(day: Date) {
    setSelected(day)
    setEditor({ mode: 'closed' })
    if (day.getFullYear() !== year || day.getMonth() + 1 !== monthNum) {
      goToMonth(day)
    }
  }

  const allEvents = events.data ?? []

  if (!today || !selected) {
    return (
      <PluginPage title="Calendar">
        <Text size="sm" c="dimmed">
          Loading calendar…
        </Text>
      </PluginPage>
    )
  }

  // A 09:00 start on the selected day, used to pre-fill the create form ("create by clicking a date").
  const seedStart = new Date(
    selected.getFullYear(),
    selected.getMonth(),
    selected.getDate(),
    9,
    0,
  ).toISOString()

  const dayEvents = allEvents.filter((e) => sameDay(e.start, selected))
  const selectedLabel = selected.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <PluginPage title="Calendar">
      <Paper p="md" mb="md" radius="md" style={{ border: cardBorder }}>
        <Text size="sm" c="dimmed">
          Today
        </Text>
        <Title order={2} size="h3">
          {today.toLocaleDateString([], {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </Title>
      </Paper>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Paper p="md" radius="md" h="100%" style={{ border: cardBorder }}>
          <CalendarMonth
            month={month}
            selected={selected}
            events={allEvents}
            onSelectDay={selectDay}
            onPrevMonth={() =>
              goToMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
            }
            onNextMonth={() =>
              goToMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
            }
            onPrevYear={() =>
              goToMonth(new Date(month.getFullYear() - 1, month.getMonth(), 1))
            }
            onNextYear={() =>
              goToMonth(new Date(month.getFullYear() + 1, month.getMonth(), 1))
            }
            onToday={() => selectDay(today)}
          />
          <Text size="xs" c="dimmed" mt="sm">
            Click a date to select it, then add an event on that day.
          </Text>
        </Paper>

        <Paper p="md" radius="md" h="100%" style={{ border: cardBorder }}>
          <Group justify="space-between" align="center" mb="sm">
            <Title order={4}>{selectedLabel}</Title>
            {editor.mode === 'closed' && (
              <Button
                size="compact-sm"
                leftSection={<Plus size={14} aria-hidden />}
                onClick={() => setEditor({ mode: 'create' })}
              >
                Add event
              </Button>
            )}
          </Group>

          {editor.mode === 'create' && (
            <CalendarEventForm
              submitLabel="Create"
              initialStart={seedStart}
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

          {events.error ? (
            <Text role="status" size="sm" c="yellow.7">
              Calendar unavailable
            </Text>
          ) : dayEvents.length === 0 ? (
            <Stack gap="xs" align="flex-start">
              <Text size="sm" c="dimmed">
                No events on this day.
              </Text>
            </Stack>
          ) : (
            <Box>
              <CalendarEventList
                events={dayEvents}
                onEdit={(event) => setEditor({ mode: 'edit', event })}
                onDelete={onDelete}
              />
            </Box>
          )}
        </Paper>
      </SimpleGrid>
    </PluginPage>
  )
}
