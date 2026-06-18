import { Badge, Box, Group, Paper, Text } from '@mantine/core'
import type { UptimeCheck } from '@pcc/contracts'

export interface UptimeListProps {
  checks: UptimeCheck[]
  error?: string
}

const rowBorder = (i: number) =>
  i > 0
    ? { borderTop: '1px solid var(--mantine-color-default-border)' }
    : undefined

/** Lists each target with an up/down badge + latency. Degrades on error. */
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
    <Paper withBorder radius="md">
      <Box component="ul" m={0} p={0} style={{ listStyle: 'none' }}>
        {checks.map((check, i) => (
          <Box component="li" key={check.url} style={rowBorder(i)}>
            <Group justify="space-between" wrap="nowrap" px="sm" py="xs">
              <div style={{ minWidth: 0 }}>
                <Text size="sm" fw={500} truncate>
                  {check.name}
                </Text>
                <Text size="xs" c="dimmed" truncate>
                  {check.url}
                </Text>
              </div>
              <Group gap="xs" wrap="nowrap" style={{ flex: 'none' }}>
                <Text size="xs" c="dimmed">
                  {check.latencyMs} ms
                </Text>
                <Badge
                  color={check.up ? 'green' : 'red'}
                  variant="light"
                  size="sm"
                >
                  {check.up ? 'up' : 'down'}
                  {check.statusCode != null ? ` · ${check.statusCode}` : ''}
                </Badge>
              </Group>
            </Group>
          </Box>
        ))}
      </Box>
    </Paper>
  )
}
