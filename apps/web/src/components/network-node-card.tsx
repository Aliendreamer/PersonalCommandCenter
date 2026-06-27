import { Badge, Group, Paper, Stack, Text } from '@mantine/core'
import type { NetworkNode } from '@pcc/contracts'

export interface NetworkNodeCardProps {
  node: NetworkNode
}

/** Card showing a single Deco node's status: online badge, CPU%, memory%, bandwidth. */
export function NetworkNodeCard({ node }: NetworkNodeCardProps) {
  return (
    <Paper withBorder p="md" radius="md">
      <Group justify="space-between" mb="xs">
        <Text fw={600} size="sm">
          {node.name}
        </Text>
        <Badge color={node.online ? 'green' : 'red'} size="sm">
          {node.online ? 'Online' : 'Offline'}
        </Badge>
      </Group>
      <Stack gap={4}>
        {node.cpuPct != null && (
          <Text size="xs" c="dimmed">
            CPU: {node.cpuPct.toFixed(0)}%
          </Text>
        )}
        {node.memPct != null && (
          <Text size="xs" c="dimmed">
            Memory: {node.memPct.toFixed(0)}%
          </Text>
        )}
        {node.connectedDevices != null && (
          <Text size="xs" c="dimmed">
            Devices: {node.connectedDevices}
          </Text>
        )}
        {(node.downKbps != null || node.upKbps != null) && (
          <Text size="xs" c="dimmed">
            ↓ {node.downKbps?.toFixed(1) ?? '—'} / ↑{' '}
            {node.upKbps?.toFixed(1) ?? '—'} KB/s
          </Text>
        )}
      </Stack>
    </Paper>
  )
}
