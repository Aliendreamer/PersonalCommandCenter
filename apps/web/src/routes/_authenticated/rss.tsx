import { createFileRoute } from '@tanstack/react-router'
import { Stack } from '@mantine/core'

import { getRss } from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { RssTopicCards } from '../../components/rss-topic-cards'
import { RssItemList } from '../../components/rss-item-list'
import { PluginPage } from '../../components/plugin-page'

export const Route = createFileRoute('/_authenticated/rss')({
  loader: async () => settle(getRss()),
  component: RssPage,
})

function RssPage() {
  const result = Route.useLoaderData()
  const items = result.data ?? []
  return (
    <PluginPage title="Feeds" fill>
      <Stack gap="lg">
        {!result.error ? <RssTopicCards items={items} /> : null}
        <RssItemList
          items={items}
          error={result.error ? 'unreachable' : undefined}
        />
      </Stack>
    </PluginPage>
  )
}
