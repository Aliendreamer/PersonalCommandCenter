import { Text } from '@mantine/core'
import type { MemoryEntry } from '@pcc/contracts'

export interface MemoryCountTileProps {
  entries?: MemoryEntry[]
  error?: boolean
}

/** Dashboard tile showing the recent memory count, degraded on error. */
export function MemoryCountTile({ entries, error }: MemoryCountTileProps) {
  if (error || !entries) {
    return (
      <Text role="status" size="sm" c="yellow.7">
        Memory unavailable
      </Text>
    )
  }

  return (
    <div>
      <Text size="sm" fw={500}>
        {entries.length} recent {entries.length === 1 ? 'memory' : 'memories'}
      </Text>
      <Text size="xs" c="dimmed">
        semantic search ready
      </Text>
    </div>
  )
}
