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
      <p role="status" className="text-sm text-warning">
        Reading list unavailable
      </p>
    )
  }

  if (books.length === 0) {
    return <p className="text-sm text-muted-foreground">No books</p>
  }

  const current = books[0]
  return (
    <div className="text-sm">
      <p className="truncate font-medium">{current.title}</p>
      <p className="text-xs text-muted-foreground">
        {current.author ? `${current.author} · ` : ''}
        {books.length} on shelf
      </p>
    </div>
  )
}
