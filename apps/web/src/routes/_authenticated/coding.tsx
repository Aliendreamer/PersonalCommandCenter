import { createFileRoute } from '@tanstack/react-router'

import { getCoding } from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { CodingView } from '../../components/coding-view'
import { PluginPage } from '../../components/plugin-page'

export const Route = createFileRoute('/_authenticated/coding')({
  loader: async () => settle(getCoding()),
  component: CodingPage,
})

function CodingPage() {
  const result = Route.useLoaderData()
  return (
    <PluginPage title="Coding">
      <CodingView
        status={result.data ?? null}
        error={result.error ? 'unreachable' : undefined}
      />
    </PluginPage>
  )
}
