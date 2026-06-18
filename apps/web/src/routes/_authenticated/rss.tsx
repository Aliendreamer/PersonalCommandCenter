import { createFileRoute } from '@tanstack/react-router'
import { Box, Title } from '@mantine/core'

import { getRss } from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { RssItemList } from '../../components/rss-item-list'

export const Route = createFileRoute('/_authenticated/rss')({
  loader: async () => settle(getRss()),
  component: RssPage,
})

function RssPage() {
  const result = Route.useLoaderData()
  return (
    <Box p="lg">
      <Title order={1} mb="md">
        Feeds
      </Title>
      <RssItemList
        items={result.data ?? []}
        error={result.error ? 'unreachable' : undefined}
      />
    </Box>
  )
}
