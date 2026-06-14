import type { RssItem } from '@pcc/contracts'

export interface RssLatestTileProps {
  items?: RssItem[]
  error?: boolean
}

/** Dashboard tile: the latest feed headline (+ count), degraded on error. */
export function RssLatestTile({ items, error }: RssLatestTileProps) {
  if (error || !items) {
    return (
      <p role="status" className="text-sm text-amber-700">
        Feeds unavailable
      </p>
    )
  }

  if (items.length === 0) {
    return <p className="text-sm text-gray-500">No items</p>
  }

  const latest = items[0]
  return (
    <div className="text-sm">
      <p className="truncate font-medium">{latest.title}</p>
      <p className="text-xs text-gray-400">
        {latest.source} · {items.length} items
      </p>
    </div>
  )
}
