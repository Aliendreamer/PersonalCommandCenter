import { createFileRoute } from '@tanstack/react-router'

import { getIotEntities } from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { IotDeviceList } from '../../components/iot-device-list'

export const Route = createFileRoute('/_authenticated/devices')({
  loader: async () => settle(getIotEntities()),
  component: DevicesPage,
})

function DevicesPage() {
  const entities = Route.useLoaderData()
  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-semibold">Devices</h1>
      <IotDeviceList
        entities={entities.data ?? []}
        error={entities.error ? 'unreachable' : undefined}
      />
    </div>
  )
}
