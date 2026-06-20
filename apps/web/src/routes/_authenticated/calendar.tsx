import { useEffect, useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import {
  Box,
  Button,
  Grid,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { Plus } from 'lucide-react'
import type { CalendarEvent, CalendarEventInput } from '@pcc/contracts'

import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvents,
  updateCalendarEvent,
} from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { CalendarMonth } from '../../components/calendar-month'
import { CalendarEventList } from '../../components/calendar-event-list'
import { CalendarEventForm } from '../../components/calendar-event-form'
import { PluginPage } from '../../components/plugin-page'

export const Route = createFileRoute('/_authenticated/calendar')({
  loader: async () => settle(getCalendarEvents()),
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
  const router = useRouter()

  // Dates are resolved on the client (after mount) so SSR/local-timezone differences can't cause a
  // hydration mismatch in the "today"/selected highlighting — mirrors the dashboard hero's clock.
  const [today, setToday] = useState<Date | null>(null)
  const [month, setMonth] = useState<Date | null>(null)
  const [selected, setSelected] = useState<Date | null>(null)
  const [editor, setEditor] = useState<Editor>({ mode: 'closed' })

  useEffect(() => {
    const now = new Date()
    setToday(now)
    setMonth(now)
    setSelected(now)
  }, [])

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
    setMonth(new Date(day.getFullYear(), day.getMonth(), 1))
    setEditor({ mode: 'closed' })
  }

  const allEvents = events.data ?? []

  if (!today || !month || !selected) {
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

      <Grid gutter="lg">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper p="md" radius="md" h="100%" style={{ border: cardBorder }}>
            <CalendarMonth
              month={month}
              selected={selected}
              events={allEvents}
              onSelectDay={selectDay}
              onPrevMonth={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
              }
              onNextMonth={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
              }
              onToday={() => selectDay(today)}
            />
            <Text size="xs" c="dimmed" mt="sm">
              Click a date to select it, then add an event on that day.
            </Text>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
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
        </Grid.Col>
      </Grid>
    </PluginPage>
  )
}
