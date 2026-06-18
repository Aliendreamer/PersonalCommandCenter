import { createFileRoute } from '@tanstack/react-router'
import { Box, Title } from '@mantine/core'

import { getCoding } from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { CodingView } from '../../components/coding-view'

export const Route = createFileRoute('/_authenticated/coding')({
  loader: async () => settle(getCoding()),
  component: CodingPage,
})

function CodingPage() {
  const result = Route.useLoaderData()
  return (
    <Box p="lg">
      <Title order={1} mb="md">
        Coding
      </Title>
      <CodingView
        status={result.data ?? null}
        error={result.error ? 'unreachable' : undefined}
      />
    </Box>
  )
}
