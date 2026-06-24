import { createFileRoute } from '@tanstack/react-router'

import { getModelLibrary, getModels } from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { ModelsView } from '../../components/models-view'
import { PluginPage } from '../../components/plugin-page'

export const Route = createFileRoute('/_authenticated/models')({
  loader: async () => {
    const [status, library] = await Promise.all([
      settle(getModels()),
      settle(getModelLibrary()),
    ])
    return { status, library }
  },
  component: ModelsPage,
})

function ModelsPage() {
  const { status, library } = Route.useLoaderData()
  return (
    <PluginPage title="Models">
      <ModelsView
        status={status.data ?? null}
        error={status.error ? 'unreachable' : undefined}
        library={library.data ?? []}
      />
    </PluginPage>
  )
}
