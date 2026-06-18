import { createFileRoute } from '@tanstack/react-router'
import { Box, Title } from '@mantine/core'

import { getModels } from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { ModelsView } from '../../components/models-view'

export const Route = createFileRoute('/_authenticated/models')({
  loader: async () => settle(getModels()),
  component: ModelsPage,
})

function ModelsPage() {
  const result = Route.useLoaderData()
  return (
    <Box p="lg">
      <Title order={1} mb="md">
        Models
      </Title>
      <ModelsView
        status={result.data ?? null}
        error={result.error ? 'unreachable' : undefined}
      />
    </Box>
  )
}
