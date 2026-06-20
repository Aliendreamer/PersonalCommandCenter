import { ActionIcon, Box, Button, Group, SimpleGrid, Text } from '@mantine/core'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { CalendarEvent } from '@pcc/contracts'

export interface CalendarMonthProps {
  /** Any date within the month to display. */
  month: Date
  /** The currently selected day (highlighted). */
  selected: Date
  /** Events in view — days containing any are dot-marked. */
  events: CalendarEvent[]
  onSelectDay: (day: Date) => void
  onPrevMonth: () => void
  onNextMonth: () => void
  onToday: () => void
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** The Monday on/before the 1st of `month`, so the grid always starts on a Monday. */
function gridStart(month: Date): Date {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const mondayOffset = (first.getDay() + 6) % 7
  first.setDate(first.getDate() - mondayOffset)
  return first
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

const cardBorder =
  '2px solid light-dark(var(--mantine-color-gray-5), var(--mantine-color-dark-3))'

/** An interactive month grid: navigate months, pick a day, see which days have events. */
export function CalendarMonth({
  month,
  selected,
  events,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
  onToday,
}: CalendarMonthProps) {
  const today = new Date()
  const start = gridStart(month)
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
  const eventDays = new Set(events.map((e) => new Date(e.start).toDateString()))

  return (
    <Box>
      <Group justify="space-between" mb="sm">
        <Text fw={700} fz="lg">
          {month.toLocaleDateString([], { month: 'long', year: 'numeric' })}
        </Text>
        <Group gap="xs">
          <ActionIcon
            variant="default"
            aria-label="Previous month"
            onClick={onPrevMonth}
          >
            <ChevronLeft size={16} aria-hidden />
          </ActionIcon>
          <Button variant="default" size="compact-sm" onClick={onToday}>
            Today
          </Button>
          <ActionIcon
            variant="default"
            aria-label="Next month"
            onClick={onNextMonth}
          >
            <ChevronRight size={16} aria-hidden />
          </ActionIcon>
        </Group>
      </Group>

      <SimpleGrid cols={7} spacing={6} mb={6}>
        {WEEKDAYS.map((w) => (
          <Text key={w} ta="center" size="xs" c="dimmed" fw={600}>
            {w}
          </Text>
        ))}
      </SimpleGrid>

      <SimpleGrid cols={7} spacing={6}>
        {days.map((d) => {
          const inMonth = d.getMonth() === month.getMonth()
          const isToday = sameDay(d, today)
          const isSelected = sameDay(d, selected)
          const hasEvents = eventDays.has(d.toDateString())
          return (
            <Box
              key={d.toISOString()}
              component="button"
              type="button"
              data-testid={`day-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`}
              data-has-events={hasEvents}
              aria-label={d.toDateString()}
              aria-pressed={isSelected}
              onClick={() => onSelectDay(new Date(d))}
              style={{
                cursor: 'pointer',
                aspectRatio: '1 / 1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                borderRadius: 'var(--mantine-radius-sm)',
                border: isToday
                  ? '2px solid var(--mantine-color-sky-6)'
                  : cardBorder,
                background: isSelected
                  ? 'var(--mantine-color-sky-6)'
                  : 'transparent',
                color: isSelected
                  ? 'var(--mantine-color-white)'
                  : inMonth
                    ? 'var(--mantine-color-text)'
                    : 'var(--mantine-color-dimmed)',
                opacity: inMonth ? 1 : 0.45,
                font: 'inherit',
              }}
            >
              <Text span size="sm" fw={isToday ? 700 : 500} inherit>
                {d.getDate()}
              </Text>
              <Box
                w={5}
                h={5}
                style={{
                  borderRadius: '50%',
                  background:
                    hasEvents && !isSelected
                      ? 'var(--mantine-color-sky-6)'
                      : hasEvents && isSelected
                        ? 'var(--mantine-color-white)'
                        : 'transparent',
                }}
              />
            </Box>
          )
        })}
      </SimpleGrid>
    </Box>
  )
}
