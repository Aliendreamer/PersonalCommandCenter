import { useState } from 'react'

export interface SearchBoxTileProps {
  /** Called with the trimmed query on submit (the dashboard navigates to /search?q=…). */
  onSearch: (q: string) => void
}

/** Dashboard tile: a small search box that hands the query off to the /search page. */
export function SearchBoxTile({ onSearch }: SearchBoxTileProps) {
  const [q, setQ] = useState('')

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        const trimmed = q.trim()
        if (trimmed) {
          onSearch(trimmed)
        }
      }}
    >
      <input
        aria-label="Search the web"
        placeholder="Search the web…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="min-w-0 flex-1 rounded border px-2 py-1 text-sm"
      />
      <button
        type="submit"
        className="rounded bg-foreground px-3 py-1 text-sm text-background"
      >
        Go
      </button>
    </form>
  )
}
