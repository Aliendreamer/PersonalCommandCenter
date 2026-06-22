import { useEffect, useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import {
  Box,
  Button,
  Flex,
  Group,
  Paper,
  SegmentedControl,
  Text,
  Title,
} from '@mantine/core'
import { Plus } from 'lucide-react'
import type {
  CalendarEvent,
  CalendarEventInput,
  CalendarSource,
} from '@pcc/contracts'

import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEventsRange,
  getCalendarSources,
  updateCalendarEvent,
} from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { upcomingEvents } from '../../lib/calendar'
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
  // Two windows: the viewed-month window (±1 month) drives the grid's event dots and refetches as the
  // user navigates; a forward window anchored to today (today → +12 months) drives the "Upcoming" list,
  // so it is stable regardless of which month is on screen.
  loader: async ({ deps: { year, month } }) => {
    const from = new Date(year, month - 2, 1)
    const to = new Date(year, month + 1, 1)
    const now = new Date()
    const upcomingFrom = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    )
    const upcomingTo = new Date(
      now.getFullYear() + 1,
      now.getMonth(),
      now.getDate(),
    )
    const [monthWindow, upcoming, sources] = await Promise.all([
      settle(
        getCalendarEventsRange({
          data: { from: from.toISOString(), to: to.toISOString() },
        }),
      ),
      settle(
        getCalendarEventsRange({
          data: {
            from: upcomingFrom.toISOString(),
            to: upcomingTo.toISOString(),
          },
        }),
      ),
      settle(getCalendarSources()),
    ])
    return { monthWindow, upcoming, sources }
  },
  component: CalendarPage,
})

type Editor =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; event: CalendarEvent }

const cardBorder =
  '2px solid light-dark(var(--mantine-color-gray-5), var(--mantine-color-dark-3))'

function CalendarPage() {
  const data = Route.useLoaderData()
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
  // Which calendar a new event is created in (only meaningful when Google is also configured).
  const [createTarget, setCreateTarget] = useState<CalendarSource>('pcc')

  const sources = data.sources.data ?? ['pcc']
  const googleEnabled = sources.includes('google')

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
    await createCalendarEvent({ data: { ...input, calendar: createTarget } })
    await refresh()
  }

  async function onUpdate(
    uid: string,
    input: CalendarEventInput,
    source: string,
  ) {
    await updateCalendarEvent({ data: { uid, event: input, source } })
    await refresh()
  }

  async function onDelete(event: CalendarEvent) {
    await deleteCalendarEvent({
      data: { uid: event.uid, source: event.source ?? 'pcc' },
    })
    await refresh()
  }

  function selectDay(day: Date) {
    setSelected(day)
    setEditor({ mode: 'closed' })
    if (day.getFullYear() !== year || day.getMonth() + 1 !== monthNum) {
      goToMonth(day)
    }
  }

  const monthEvents = data.monthWindow.data ?? []

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

  // The right pane shows all upcoming events (today onward), not just the selected day.
  const upcoming = upcomingEvents(data.upcoming.data ?? [], today)

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

      <Flex direction={{ base: 'column', md: 'row' }} gap="lg" align="stretch">
        <Box flex={{ md: 5 }} miw={0}>
          <Paper p="md" radius="md" h="100%" style={{ border: cardBorder }}>
            <CalendarMonth
              month={month}
              selected={selected}
              events={monthEvents}
              onSelectDay={selectDay}
              onPrevMonth={() =>
                goToMonth(
                  new Date(month.getFullYear(), month.getMonth() - 1, 1),
                )
              }
              onNextMonth={() =>
                goToMonth(
                  new Date(month.getFullYear(), month.getMonth() + 1, 1),
                )
              }
              onPrevYear={() =>
                goToMonth(
                  new Date(month.getFullYear() - 1, month.getMonth(), 1),
                )
              }
              onNextYear={() =>
                goToMonth(
                  new Date(month.getFullYear() + 1, month.getMonth(), 1),
                )
              }
              onToday={() => selectDay(today)}
            />
            <Text size="xs" c="dimmed" mt="sm">
              Click a date to select it, then add an event on that day.
            </Text>
          </Paper>
        </Box>

        <Box flex={{ md: 7 }} miw={0}>
          <Paper p="md" radius="md" h="100%" style={{ border: cardBorder }}>
            <Group justify="space-between" align="center" mb="sm">
              <Title order={4}>Upcoming</Title>
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
              <>
                {googleEnabled && (
                  <Group gap="xs" mb="sm" align="center">
                    <Text size="sm" c="dimmed">
                      Calendar
                    </Text>
                    <SegmentedControl
                      size="xs"
                      value={createTarget}
                      onChange={(v) => setCreateTarget(v)}
                      data={[
                        { label: 'PCC', value: 'pcc' },
                        { label: 'Google', value: 'google' },
                      ]}
                    />
                  </Group>
                )}
                <CalendarEventForm
                  submitLabel="Create"
                  initialStart={seedStart}
                  onSubmit={onCreate}
                  onCancel={() => setEditor({ mode: 'closed' })}
                />
              </>
            )}
            {editor.mode === 'edit' && (
              <CalendarEventForm
                submitLabel="Update"
                initial={editor.event}
                onSubmit={(input) =>
                  onUpdate(
                    editor.event.uid,
                    input,
                    editor.event.source ?? 'pcc',
                  )
                }
                onCancel={() => setEditor({ mode: 'closed' })}
              />
            )}

            <CalendarEventList
              events={upcoming}
              error={data.upcoming.error ? 'unreachable' : undefined}
              onEdit={(event) => setEditor({ mode: 'edit', event })}
              onDelete={onDelete}
            />
          </Paper>
        </Box>
      </Flex>
    </PluginPage>
  )
}
