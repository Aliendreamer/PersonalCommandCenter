import { Text } from '@mantine/core'
import type { NetworkStatus } from '@pcc/contracts'

export interface NetworkDevicesTileProps {
  status?: NetworkStatus
  error?: boolean
}

/** Dashboard tile: how many devices are home out of total. */
export function NetworkDevicesTile({ status, error }: NetworkDevicesTileProps) {
  if (error || !status) {
    return (
      <Text role="status" size="sm" c="yellow.7">
        Network unavailable
      </Text>
    )
  }

  const total = status.devices.length
  const home = status.devices.filter((d) => d.home).length

  if (total === 0) {
    return (
      <Text size="sm" c="dimmed">
        No devices
      </Text>
    )
  }

  return (
    <Text size="sm" fw={500}>
      {home} / {total} home
    </Text>
  )
}
