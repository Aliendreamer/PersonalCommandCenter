import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Button, Group, TextInput } from '@mantine/core'

import { getSearch } from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { SearchResultList } from '../../components/search-result-list'
import { PluginPage } from '../../components/plugin-page'

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
    <PluginPage title="Search">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const trimmed = input.trim()
          navigate({ search: trimmed ? { q: trimmed } : {} })
        }}
      >
        <Group gap="sm" maw={576} mb="lg" wrap="nowrap">
          <TextInput
            aria-label="Search the web"
            placeholder="Search the web…"
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Button type="submit">Search</Button>
        </Group>
      </form>

      <SearchResultList
        results={result?.data ?? []}
        error={result?.error ? 'unreachable' : undefined}
        idle={!q}
      />
    </PluginPage>
  )
}
