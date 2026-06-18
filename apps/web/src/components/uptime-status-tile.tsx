import { Text } from '@mantine/core'
import type { UptimeCheck } from '@pcc/contracts'

export interface UptimeStatusTileProps {
  checks?: UptimeCheck[]
  error?: boolean
}

/** Dashboard tile: how many configured targets are up (N/M), degraded on error. */
export function UptimeStatusTile({ checks, error }: UptimeStatusTileProps) {
  if (error || !checks) {
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

  const up = checks.filter((c) => c.up).length
  const allUp = up === checks.length
  return (
    <Text size="sm" fw={500} c={allUp ? 'green' : 'yellow.7'}>
      {up}/{checks.length} up
    </Text>
  )
}
