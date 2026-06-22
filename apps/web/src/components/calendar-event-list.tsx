import {
  Anchor,
  Badge,
  Box,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core'
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

const rowBorder = (i: number) =>
  i > 0
    ? { borderTop: '1px solid var(--mantine-color-default-border)' }
    : undefined

/** Lists calendar events grouped by day; degrades on error. */
export function CalendarEventList({
  events,
  error,
  onEdit,
  onDelete,
}: CalendarEventListProps) {
  if (error) {
    return (
      <Text role="status" size="sm" c="yellow.7">
        Calendar unavailable
      </Text>
    )
  }

  if (events.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No upcoming events
      </Text>
    )
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
    <Stack gap="lg">
      {[...byDay.values()].map((list) => (
        <section
          key={new Date(list[0].start).toDateString()}
          data-testid={`day-${new Date(list[0].start).toDateString()}`}
        >
          <Title order={5} mb="xs">
            {dayLabel(list[0].start)}
          </Title>
          <Paper withBorder radius="md">
            <Box component="ul" m={0} p={0} style={{ listStyle: 'none' }}>
              {list.map((event, i) => (
                <Box component="li" key={event.uid} style={rowBorder(i)}>
                  <Group justify="space-between" wrap="nowrap" px="sm" py="xs">
                    <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                      <Text size="sm" truncate>
                        <Text span c="dimmed">
                          {timeLabel(event)}
                        </Text>{' '}
                        {event.title}
                      </Text>
                      {event.source === 'google' && (
                        <Badge
                          size="xs"
                          variant="light"
                          color="grape"
                          style={{ flex: 'none' }}
                        >
                          Google
                        </Badge>
                      )}
                    </Group>
                    {(onEdit || onDelete) && (
                      <Group gap="sm" wrap="nowrap" style={{ flex: 'none' }}>
                        {onEdit && (
                          <Anchor
                            component="button"
                            type="button"
                            size="sm"
                            onClick={() => onEdit(event)}
                          >
                            Edit
                          </Anchor>
                        )}
                        {onDelete && (
                          <Anchor
                            component="button"
                            type="button"
                            size="sm"
                            c="red"
                            onClick={() => onDelete(event)}
                          >
                            Delete
                          </Anchor>
                        )}
                      </Group>
                    )}
                  </Group>
                </Box>
              ))}
            </Box>
          </Paper>
        </section>
      ))}
    </Stack>
  )
}
