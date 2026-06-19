import { createFileRoute } from '@tanstack/react-router'

import { getUptime } from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { UptimeList } from '../../components/uptime-list'
import { PluginPage } from '../../components/plugin-page'

export const Route = createFileRoute('/_authenticated/uptime')({
  loader: async () => settle(getUptime()),
  component: UptimePage,
})

function UptimePage() {
  const result = Route.useLoaderData()
  return (
    <PluginPage title="Uptime">
      <UptimeList
        checks={result.data ?? []}
        error={result.error ? 'unreachable' : undefined}
      />
    </PluginPage>
  )
}
