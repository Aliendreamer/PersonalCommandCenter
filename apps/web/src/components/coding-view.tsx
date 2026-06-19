import {
  Group,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'
import type { CodingStatus } from '@pcc/contracts'

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

/** The /coding page body: this-week total, per-day strip, project tiles, languages table. */
export function CodingView({ status, error }: CodingViewProps) {
  if (error || !status) {
    return (
      <Text role="status" size="sm" c="yellow.7">
        Coding activity unavailable
      </Text>
    )
  }

  const maxProject = Math.max(...status.projects.map((p) => p.seconds), 1)
  const maxLanguage = Math.max(...status.languages.map((l) => l.seconds), 1)

  return (
    <Stack gap="lg">
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

      <section>
        <Title order={3} size="h5" mb="sm">
          Projects
        </Title>
        {status.projects.length === 0 ? (
          <Text size="sm" c="dimmed">
            No data
          </Text>
        ) : (
          <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing="sm">
            {status.projects.map((project) => (
              <Paper key={project.name} withBorder radius="md" p="sm">
                <Group justify="space-between" gap="xs" wrap="nowrap" mb={8}>
                  <Text size="sm" fw={600} truncate>
                    {project.name}
                  </Text>
                  <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                    {formatDuration(project.seconds)}
                  </Text>
                </Group>
                <Progress
                  value={(project.seconds / maxProject) * 100}
                  size="xs"
                  color="sky"
                  aria-label={`${project.name} share`}
                />
              </Paper>
            ))}
          </SimpleGrid>
        )}
      </section>

      <section>
        <Title order={3} size="h5" mb="sm">
          Languages
        </Title>
        {status.languages.length === 0 ? (
          <Text size="sm" c="dimmed">
            No data
          </Text>
        ) : (
          <Paper withBorder radius="md">
            <Table highlightOnHover verticalSpacing="xs" horizontalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Language</Table.Th>
                  <Table.Th ta="right">Time</Table.Th>
                  <Table.Th w="45%">Share</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {status.languages.map((language) => (
                  <Table.Tr key={language.name}>
                    <Table.Td>{language.name}</Table.Td>
                    <Table.Td ta="right" c="dimmed">
                      {formatDuration(language.seconds)}
                    </Table.Td>
                    <Table.Td>
                      <Progress
                        value={(language.seconds / maxLanguage) * 100}
                        size="sm"
                        color="sky"
                        aria-label={`${language.name} share`}
                      />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        )}
      </section>
    </Stack>
  )
}
