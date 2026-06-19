import { createFileRoute } from '@tanstack/react-router'
import type { CodingRange } from '@pcc/contracts'

import { getCoding } from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { CodingView } from '../../components/coding-view'
import { PluginPage } from '../../components/plugin-page'

function isRange(value: unknown): value is CodingRange {
  return value === 'week' || value === 'month' || value === 'year'
}

export const Route = createFileRoute('/_authenticated/coding')({
  // `range` is JSON-validated search-param state; an unknown value falls back to the week.
  validateSearch: (
    search: Record<string, unknown>,
  ): { range: CodingRange } => ({
    range: isRange(search.range) ? search.range : 'week',
  }),
  loaderDeps: ({ search: { range } }) => ({ range }),
  loader: async ({ deps: { range } }) => settle(getCoding({ data: range })),
  component: CodingPage,
})

function CodingPage() {
  const { range } = Route.useSearch()
  const result = Route.useLoaderData()
  const navigate = Route.useNavigate()

  return (
    <PluginPage title="Coding">
      <CodingView
        status={result.data ?? null}
        error={result.error ? 'unreachable' : undefined}
        range={range}
        onRangeChange={(next) => navigate({ search: { range: next } })}
      />
    </PluginPage>
  )
}
