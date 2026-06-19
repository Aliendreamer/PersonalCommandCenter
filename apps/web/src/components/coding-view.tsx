import { Group, Paper, Stack, Text, Title } from '@mantine/core'
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

/** A card of name·duration rows (projects or languages). */
function Breakdown({ title, items }: { title: string; items: CodingBucket[] }) {
  return (
    <Paper component="section" withBorder radius="md" p="md">
      <Title order={3} size="h5" mb="sm">
        {title}
      </Title>
      {items.length === 0 ? (
        <Text size="sm" c="dimmed">
          No data
        </Text>
      ) : (
        <Stack gap="xs">
          {items.map((item) => (
            <Group
              key={item.name}
              justify="space-between"
              gap="md"
              wrap="nowrap"
            >
              <Text size="sm">{item.name}</Text>
              <Text size="sm" c="dimmed">
                {formatDuration(item.seconds)}
              </Text>
            </Group>
          ))}
        </Stack>
      )}
    </Paper>
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
    <Stack gap="md">
      <Paper component="section" withBorder radius="md" p="md">
        <Title order={3} size="h5" mb="xs">
          This week
        </Title>
        <Text fz={32} fw={700} lh={1}>
          {formatDuration(status.weekSeconds)}
        </Text>
        <Group gap="sm" mt="md" wrap="wrap">
          {status.days.length === 0 ? (
            <Text size="sm" c="dimmed">
              No activity this week
            </Text>
          ) : (
            status.days.map((day) => (
              <Paper
                key={day.date}
                withBorder
                radius="sm"
                px="sm"
                py={4}
                bg="var(--mantine-color-default)"
              >
                <Text span size="xs" fw={600}>
                  {weekday(day.date)}
                </Text>{' '}
                <Text span size="xs" c="dimmed">
                  {formatDuration(day.seconds)}
                </Text>
              </Paper>
            ))
          )}
        </Group>
      </Paper>

      <Breakdown title="Projects" items={status.projects} />
      <Breakdown title="Languages" items={status.languages} />
    </Stack>
  )
}
