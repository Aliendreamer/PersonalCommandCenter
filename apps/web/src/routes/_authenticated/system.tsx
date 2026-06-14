import { createFileRoute } from '@tanstack/react-router'

import { getSystemStatus } from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { SystemTile } from '../../components/system-tile'

export const Route = createFileRoute('/_authenticated/system')({
  loader: async () => settle(getSystemStatus()),
  component: SystemPage,
})

function SystemPage() {
  const status = Route.useLoaderData()
  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-semibold">System</h1>
      <div className="max-w-sm rounded border p-4">
        <SystemTile status={status.data} error={status.error} />
      </div>
    </div>
  )
}
