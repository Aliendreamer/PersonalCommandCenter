import { Text } from '@mantine/core'
import type { Book } from '@pcc/contracts'

export interface GoodreadsReadingTileProps {
  books?: Book[]
  error?: boolean
}

/** Dashboard tile: what you're currently reading (first title + count), degraded on error. */
export function GoodreadsReadingTile({
  books,
  error,
}: GoodreadsReadingTileProps) {
  if (error || !books) {
    return (
      <Text role="status" size="sm" c="yellow.7">
        Reading list unavailable
      </Text>
    )
  }

  if (books.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No books
      </Text>
    )
  }

  const current = books[0]
  return (
    <div>
      <Text size="sm" fw={500} truncate>
        {current.title}
      </Text>
      <Text size="xs" c="dimmed">
        {current.author ? `${current.author} · ` : ''}
        {books.length} on shelf
      </Text>
    </div>
  )
}
