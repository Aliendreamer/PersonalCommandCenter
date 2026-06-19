import { createFileRoute } from '@tanstack/react-router'

import { getModels } from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { ModelsView } from '../../components/models-view'
import { PluginPage } from '../../components/plugin-page'

export const Route = createFileRoute('/_authenticated/models')({
  loader: async () => settle(getModels()),
  component: ModelsPage,
})

function ModelsPage() {
  const result = Route.useLoaderData()
  return (
    <PluginPage title="Models">
      <ModelsView
        status={result.data ?? null}
        error={result.error ? 'unreachable' : undefined}
      />
    </PluginPage>
  )
}
