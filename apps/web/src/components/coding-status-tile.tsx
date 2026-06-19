import { Text } from '@mantine/core'
import type { CodingStatus } from '@pcc/contracts'

import { formatDuration } from '../lib/duration'

export interface CodingStatusTileProps {
  status?: CodingStatus
  error?: boolean
}

/** Dashboard tile: this-week coding time headline + today secondary; degraded on error. */
export function CodingStatusTile({ status, error }: CodingStatusTileProps) {
  if (error || !status) {
    return (
      <Text role="status" size="sm" c="yellow.7">
        Coding unavailable
      </Text>
    )
  }

  return (
    <div>
      <Text size="sm" fw={500}>
        {formatDuration(status.totalSeconds)} this week
      </Text>
      <Text size="xs" c="dimmed">
        {formatDuration(status.todaySeconds)} today
      </Text>
    </div>
  )
}
