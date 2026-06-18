import { Group, Stack, Text } from '@mantine/core'
import type { SystemStatus } from '@pcc/contracts'

export interface SystemTileProps {
  /** Provided by the route loader (SSR-with-data); absent when the source is degraded. */
  status?: SystemStatus
  error?: boolean
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Group justify="space-between" gap="sm">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm">{value}</Text>
    </Group>
  )
}

/** Dashboard tile showing system status, with a degraded state when unavailable. */
export function SystemTile({ status, error }: SystemTileProps) {
  if (error || !status) {
    return (
      <Text role="status" size="sm" c="yellow.7">
        Status unavailable
      </Text>
    )
  }

  return (
    <Stack gap={4}>
      <Row label="Healthy" value={status.apiHealthy ? 'yes' : 'no'} />
      <Row label="Host" value={status.hostname} />
      <Row label="Version" value={status.version} />
    </Stack>
  )
}
