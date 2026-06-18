import { createFileRoute } from '@tanstack/react-router'
import { Box, Paper, Title } from '@mantine/core'

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
    <Box p="lg">
      <Title order={1} mb="md">
        System
      </Title>
      <Paper withBorder radius="md" p="md" maw={360}>
        <SystemTile status={status.data} error={status.error} />
      </Paper>
    </Box>
  )
}
