import { Text } from '@mantine/core'
import type { RssItem } from '@pcc/contracts'

export interface RssLatestTileProps {
  items?: RssItem[]
  error?: boolean
}

/** Dashboard tile: the latest feed headline (+ count), degraded on error. */
export function RssLatestTile({ items, error }: RssLatestTileProps) {
  if (error || !items) {
    return (
      <Text role="status" size="sm" c="yellow.7">
        Feeds unavailable
      </Text>
    )
  }

  if (items.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No items
      </Text>
    )
  }

  const latest = items[0]
  return (
    <div>
      <Text size="sm" fw={500} truncate>
        {latest.title}
      </Text>
      <Text size="xs" c="dimmed">
        {latest.source} · {items.length} items
      </Text>
    </div>
  )
}
