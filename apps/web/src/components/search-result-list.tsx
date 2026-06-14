import type { SearchResult } from '@pcc/contracts'

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
      <p role="status" className="text-sm text-amber-700">
        Search unavailable
      </p>
    )
  }

  if (idle) {
    return <p className="text-sm text-gray-500">Enter a query to search.</p>
  }

  if (results.length === 0) {
    return <p className="text-sm text-gray-500">No results</p>
  }

  return (
    <ul className="space-y-4">
      {results.map((r) => (
        <li key={r.url}>
          <a
            href={r.url}
            target="_blank"
            rel="noreferrer"
            className="text-sky-700 underline"
          >
            {r.title}
          </a>
          {r.content && <p className="text-sm text-gray-600">{r.content}</p>}
          <p className="truncate text-xs text-gray-400">
            {r.url}
            {r.engine ? ` · ${r.engine}` : ''}
          </p>
        </li>
      ))}
    </ul>
  )
}
