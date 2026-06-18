import { Group, Stack, Text } from '@mantine/core'
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
      <Text role="status" size="sm" c="yellow.7">
        Calendar unavailable
      </Text>
    )
  }

  const today = events.filter((event) => isToday(event.start))
  if (today.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        Nothing today
      </Text>
    )
  }

  return (
    <Stack gap={4}>
      {today.map((event) => (
        <Group key={event.uid} justify="space-between" gap="sm" wrap="nowrap">
          <Text size="sm" truncate>
            {event.title}
          </Text>
          <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>
            {formatTime(event)}
          </Text>
        </Group>
      ))}
    </Stack>
  )
}
