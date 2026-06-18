import { createFileRoute } from '@tanstack/react-router'
import { Box, Title } from '@mantine/core'

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
    <Box p="lg">
      <Title order={1} mb="md">
        Devices
      </Title>
      <IotDeviceList
        entities={entities.data ?? []}
        error={entities.error ? 'unreachable' : undefined}
      />
    </Box>
  )
}
