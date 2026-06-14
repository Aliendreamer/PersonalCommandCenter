import { createFileRoute } from '@tanstack/react-router'

import { getUptime } from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { UptimeList } from '../../components/uptime-list'

export const Route = createFileRoute('/_authenticated/uptime')({
  loader: async () => settle(getUptime()),
  component: UptimePage,
})

function UptimePage() {
  const result = Route.useLoaderData()
  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-semibold">Uptime</h1>
      <UptimeList
        checks={result.data ?? []}
        error={result.error ? 'unreachable' : undefined}
      />
    </div>
  )
}
