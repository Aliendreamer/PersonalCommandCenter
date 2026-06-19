import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Group,
  Paper,
  Progress,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
  UnstyledButton,
} from '@mantine/core'
import type { CodingBucket, CodingRange, CodingStatus } from '@pcc/contracts'

import { formatDuration } from '../lib/duration'

export interface CodingViewProps {
  status: CodingStatus | null
  error?: string
  range: CodingRange
  onRangeChange: (range: CodingRange) => void
}

/** A short weekday label (e.g. "Mon") from an ISO `yyyy-MM-dd` date. */
function weekday(date: string): string {
  const parsed = new Date(`${date}T00:00:00`)
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString(undefined, { weekday: 'short' })
}

/** A "Jun 18" style label from an ISO `yyyy-MM-dd` date. */
function shortDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`)
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Projects rendered as a grid of tiles, each with a proportion bar. */
function ProjectTiles({ projects }: { projects: CodingBucket[] }) {
  if (projects.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No data
      </Text>
    )
  }
  const max = Math.max(...projects.map((p) => p.seconds), 1)
  return (
    <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing="sm">
      {projects.map((project) => (
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
            value={(project.seconds / max) * 100}
            size="xs"
            color="sky"
            aria-label={`${project.name} share`}
          />
        </Paper>
      ))}
    </SimpleGrid>
  )
}

/** Languages rendered as a table with a proportion-bar share column. */
function LanguageTable({ languages }: { languages: CodingBucket[] }) {
  if (languages.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No data
      </Text>
    )
  }
  const max = Math.max(...languages.map((l) => l.seconds), 1)
  return (
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
          {languages.map((language) => (
            <Table.Tr key={language.name}>
              <Table.Td>{language.name}</Table.Td>
              <Table.Td ta="right" c="dimmed">
                {formatDuration(language.seconds)}
              </Table.Td>
              <Table.Td>
                <Progress
                  value={(language.seconds / max) * 100}
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
  )
}

/** The /coding page body: range control, this-range total, a clickable per-day bar chart, and the
 *  projects/languages breakdown (whole range, or a single selected day). Degrades on error. */
export function CodingView({
  status,
  error,
  range,
  onRangeChange,
}: CodingViewProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // A day from one range may not exist in another — clear the selection when the range changes.
  useEffect(() => setSelectedDate(null), [range])

  if (error || !status) {
    return (
      <Text role="status" size="sm" c="yellow.7">
        Coding activity unavailable
      </Text>
    )
  }

  const selectedDay = selectedDate
    ? (status.days.find((d) => d.date === selectedDate) ?? null)
    : null
  const projects = selectedDay ? selectedDay.projects : status.projects
  const languages = selectedDay ? selectedDay.languages : status.languages
  const maxDay = Math.max(...status.days.map((d) => d.seconds), 1)

  return (
    <Stack gap="lg">
      <SegmentedControl
        value={range}
        onChange={(value) => onRangeChange(value)}
        data={[
          { label: 'Week', value: 'week' },
          { label: 'Month', value: 'month' },
          { label: 'Year', value: 'year' },
        ]}
        w="fit-content"
      />

      <Paper component="section" withBorder radius="md" p="md">
        <Title order={3} size="h5" mb="xs" tt="capitalize">
          This {range}
        </Title>
        <Text fz={32} fw={700} lh={1}>
          {formatDuration(status.totalSeconds)}
        </Text>

        {status.days.length === 0 ? (
          <Text size="sm" c="dimmed" mt="md">
            No activity this {range}
          </Text>
        ) : (
          <Group
            gap={3}
            align="flex-end"
            mt="md"
            h={72}
            wrap="nowrap"
            style={{ overflowX: 'auto' }}
          >
            {status.days.map((day) => {
              const active = day.date === selectedDate
              return (
                <Tooltip
                  key={day.date}
                  label={`${shortDate(day.date)} · ${formatDuration(day.seconds)}`}
                  withArrow
                >
                  <UnstyledButton
                    aria-label={`${weekday(day.date)} ${formatDuration(day.seconds)}`}
                    onClick={() => setSelectedDate(active ? null : day.date)}
                    style={{
                      flex: 1,
                      minWidth: 4,
                      height: '100%',
                      display: 'flex',
                      alignItems: 'flex-end',
                    }}
                  >
                    <Box
                      w="100%"
                      style={{
                        height: `${Math.max((day.seconds / maxDay) * 100, 4)}%`,
                        borderRadius: 3,
                        background: active
                          ? 'var(--mantine-color-sky-5)'
                          : 'var(--mantine-color-sky-8)',
                      }}
                    />
                  </UnstyledButton>
                </Tooltip>
              )
            })}
          </Group>
        )}

        {selectedDay ? (
          <Group gap="sm" mt="sm" align="center">
            <Text size="sm" c="dimmed">
              Showing {shortDate(selectedDay.date)} ·{' '}
              {formatDuration(selectedDay.seconds)}
            </Text>
            <Button
              variant="subtle"
              size="compact-xs"
              onClick={() => setSelectedDate(null)}
              aria-label={`Whole ${range}`}
            >
              Whole {range}
            </Button>
          </Group>
        ) : null}
      </Paper>

      <section>
        <Title order={3} size="h5" mb="sm">
          Projects
        </Title>
        <ProjectTiles projects={projects} />
      </section>

      <section>
        <Title order={3} size="h5" mb="sm">
          Languages
        </Title>
        <LanguageTable languages={languages} />
      </section>
    </Stack>
  )
}
