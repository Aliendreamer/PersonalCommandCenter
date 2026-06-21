import { createFileRoute } from '@tanstack/react-router'

import { getIotEntities } from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { IotDeviceList } from '../../components/iot-device-list'
import { PluginPage } from '../../components/plugin-page'

export const Route = createFileRoute('/_authenticated/devices')({
  loader: async () => settle(getIotEntities()),
  component: DevicesPage,
})

function DevicesPage() {
  const entities = Route.useLoaderData()
  return (
    <PluginPage title="Devices" fill>
      <IotDeviceList
        entities={entities.data ?? []}
        error={entities.error ? 'unreachable' : undefined}
      />
    </PluginPage>
  )
}
