import { createFileRoute } from '@tanstack/react-router'
import { Box, Title } from '@mantine/core'

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
    <Box p="lg">
      <Title order={1} mb="md">
        Uptime
      </Title>
      <UptimeList
        checks={result.data ?? []}
        error={result.error ? 'unreachable' : undefined}
      />
    </Box>
  )
}
