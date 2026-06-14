import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { getSearch } from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { SearchResultList } from '../../components/search-result-list'

export const Route = createFileRoute('/_authenticated/search')({
  // `q` is JSON-validated search-param state; a blank query is normalized away.
  validateSearch: (search: Record<string, unknown>): { q?: string } => {
    const q = typeof search.q === 'string' ? search.q.trim() : ''
    return q ? { q } : {}
  },
  loaderDeps: ({ search: { q } }) => ({ q }),
  // Only hit the API when there's a query; bare /search renders the box with no fetch.
  loader: async ({ deps: { q } }) =>
    q ? settle(getSearch({ data: q })) : null,
  component: SearchPage,
})

function SearchPage() {
  const { q } = Route.useSearch()
  const result = Route.useLoaderData()
  const navigate = Route.useNavigate()
  const [input, setInput] = useState(q ?? '')

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-semibold">Search</h1>
      <form
        className="mb-6 flex max-w-xl gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          const trimmed = input.trim()
          navigate({ search: trimmed ? { q: trimmed } : {} })
        }}
      >
        <input
          aria-label="Search the web"
          placeholder="Search the web…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 rounded border px-3 py-2"
        />
        <button
          type="submit"
          className="rounded bg-gray-900 px-4 py-2 text-white"
        >
          Search
        </button>
      </form>

      <SearchResultList
        results={result?.data ?? []}
        error={result?.error ? 'unreachable' : undefined}
        idle={!q}
      />
    </div>
  )
}
