import { Box, Group, Stack, Text, Title } from '@mantine/core'
import type { CodingBucket, CodingStatus } from '@pcc/contracts'

import { formatDuration } from '../lib/duration'

export interface CodingViewProps {
  status: CodingStatus | null
  error?: string
}

/** A short weekday label (e.g. "Mon") from an ISO `yyyy-MM-dd` date. */
function weekday(date: string): string {
  const parsed = new Date(`${date}T00:00:00`)
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString(undefined, { weekday: 'short' })
}

function Breakdown({ title, items }: { title: string; items: CodingBucket[] }) {
  return (
    <section>
      <Title order={3} mb="xs">
        {title}
      </Title>
      {items.length === 0 ? (
        <Text size="sm" c="dimmed">
          No data
        </Text>
      ) : (
        <Box component="ul" m={0} p={0} style={{ listStyle: 'none' }}>
          {items.map((item) => (
            <Group key={item.name} justify="space-between" gap="md">
              <Text component="li" size="sm">
                {item.name}
              </Text>
              <Text size="sm" c="dimmed">
                {formatDuration(item.seconds)}
              </Text>
            </Group>
          ))}
        </Box>
      )}
    </section>
  )
}

/** The /coding page body: this-week total, per-day strip, projects + languages. Degrades on error. */
export function CodingView({ status, error }: CodingViewProps) {
  if (error || !status) {
    return (
      <Text role="status" size="sm" c="yellow.7">
        Coding activity unavailable
      </Text>
    )
  }

  return (
    <Stack gap="lg">
      <section>
        <Title order={3} mb="xs">
          This week
        </Title>
        <Text size="xl" fw={600}>
          {formatDuration(status.weekSeconds)}
        </Text>
        <Group gap="md" mt="xs" wrap="wrap">
          {status.days.length === 0 ? (
            <Text size="sm" c="dimmed">
              No activity this week
            </Text>
          ) : (
            status.days.map((day) => (
              <Text key={day.date} size="sm">
                <Text span fw={500}>
                  {weekday(day.date)}
                </Text>{' '}
                <Text span c="dimmed">
                  {formatDuration(day.seconds)}
                </Text>
              </Text>
            ))
          )}
        </Group>
      </section>

      <Breakdown title="Projects" items={status.projects} />
      <Breakdown title="Languages" items={status.languages} />
    </Stack>
  )
}
