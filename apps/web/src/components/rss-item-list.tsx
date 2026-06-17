import type { RssItem } from '@pcc/contracts'
import { safeHref } from '../lib/safe-href'

export interface RssItemListProps {
  items: RssItem[]
  error?: string
}

function when(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

/** Lists feed items newest-first (title links out, with source + date); degrades on error. */
export function RssItemList({ items, error }: RssItemListProps) {
  if (error) {
    return (
      <p role="status" className="text-sm text-warning">
        Feeds unavailable
      </p>
    )
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No items</p>
  }

  return (
    <ul className="divide-y rounded border">
      {items.map((item) => (
        <li key={item.link} className="px-3 py-2 text-sm">
          <a
            href={safeHref(item.link)}
            target="_blank"
            rel="noreferrer noopener"
            className="text-accent underline"
          >
            {item.title}
          </a>
          <p className="text-xs text-muted-foreground">
            {item.source}
            {when(item.published) ? ` · ${when(item.published)}` : ''}
          </p>
        </li>
      ))}
    </ul>
  )
}
