import {
  Badge,
  Box,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core'
import type { UptimeCheck } from '@pcc/contracts'

export interface UptimeListProps {
  checks: UptimeCheck[]
  error?: string
}

function uptimeDuration(upSince: string): string {
  const ms = Date.now() - new Date(upSince).getTime()
  const totalMinutes = Math.floor(ms / 60000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const mins = totalMinutes % 60
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

/** A responsive grid of status tiles — one per target — each with an up/down accent, badge + latency. */
export function UptimeList({ checks, error }: UptimeListProps) {
  if (error) {
    return (
      <Text role="status" size="sm" c="yellow.7">
        Uptime unavailable
      </Text>
    )
  }

  if (checks.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No targets
      </Text>
    )
  }

  return (
    <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, lg: 4 }} spacing="md">
      {checks.map((check) => {
        const color = check.up ? 'green' : 'red'
        return (
          <Paper
            key={check.url}
            component="section"
            data-testid={`uptime-tile-${check.name}`}
            radius="md"
            p="sm"
            shadow="xs"
            style={{
              border:
                '2px solid light-dark(var(--mantine-color-gray-5), var(--mantine-color-dark-3))',
              borderLeft: `4px solid var(--mantine-color-${color}-6)`,
            }}
          >
            <Group justify="space-between" wrap="nowrap" mb={6}>
              <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                <Box
                  w={10}
                  h={10}
                  style={{
                    flex: 'none',
                    borderRadius: '50%',
                    background: `var(--mantine-color-${color}-6)`,
                  }}
                />
                <Text size="sm" fw={600} truncate>
                  {check.name}
                </Text>
              </Group>
              <Badge
                color={color}
                variant="light"
                size="sm"
                style={{ flex: 'none' }}
              >
                {check.up ? 'up' : 'down'}
                {check.statusCode != null ? ` · ${check.statusCode}` : ''}
              </Badge>
            </Group>
            <Text size="xs" c="dimmed" truncate title={check.url}>
              {check.url}
            </Text>
            <Stack gap={0} mt={4}>
              <Text size="xs" c="dimmed">
                {check.latencyMs} ms
              </Text>
              {check.upSince ? (
                <Text size="xs" fw={500} c="green.5">
                  up {uptimeDuration(check.upSince)}
                </Text>
              ) : null}
            </Stack>
          </Paper>
        )
      })}
    </SimpleGrid>
  )
}
