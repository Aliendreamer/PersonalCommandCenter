import { createFileRoute } from '@tanstack/react-router'

import { getModels } from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { ModelsView } from '../../components/models-view'

export const Route = createFileRoute('/_authenticated/models')({
  loader: async () => settle(getModels()),
  component: ModelsPage,
})

function ModelsPage() {
  const result = Route.useLoaderData()
  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-semibold">Models</h1>
      <ModelsView
        status={result.data ?? null}
        error={result.error ? 'unreachable' : undefined}
      />
    </div>
  )
}
