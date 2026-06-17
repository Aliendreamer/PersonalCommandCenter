import type { SearchResult } from '@pcc/contracts'
import { safeHref } from '../lib/safe-href'

export interface SearchResultListProps {
  results: SearchResult[]
  error?: string
  /** No query entered yet (vs. an empty result set). */
  idle?: boolean
}

/** Lists metasearch results; degrades on error and shows prompts for idle/empty. */
export function SearchResultList({
  results,
  error,
  idle,
}: SearchResultListProps) {
  if (error) {
    return (
      <p role="status" className="text-sm text-warning">
        Search unavailable
      </p>
    )
  }

  if (idle) {
    return (
      <p className="text-sm text-muted-foreground">Enter a query to search.</p>
    )
  }

  if (results.length === 0) {
    return <p className="text-sm text-muted-foreground">No results</p>
  }

  return (
    <ul className="space-y-4">
      {results.map((r) => (
        <li key={r.url}>
          <a
            href={safeHref(r.url)}
            target="_blank"
            rel="noreferrer noopener"
            className="text-accent underline"
          >
            {r.title}
          </a>
          {r.content && (
            <p className="text-sm text-muted-foreground">{r.content}</p>
          )}
          <p className="truncate text-xs text-muted-foreground">
            {r.url}
            {r.engine ? ` · ${r.engine}` : ''}
          </p>
        </li>
      ))}
    </ul>
  )
}
