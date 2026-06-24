import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Stack } from '@mantine/core'

import { getRss, refreshRss } from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { RssTopicCards } from '../../components/rss-topic-cards'
import { RssItemList } from '../../components/rss-item-list'
import { RssRefreshButton } from '../../components/rss-refresh-button'
import { PluginPage } from '../../components/plugin-page'

export const Route = createFileRoute('/_authenticated/rss')({
  loader: async () => settle(getRss()),
  component: RssPage,
})

function RssPage() {
  const result = Route.useLoaderData()
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const items = result.data ?? []

  const onRefresh = async () => {
    setRefreshing(true)
    try {
      await refreshRss()
      await router.invalidate()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <PluginPage
      title="Feeds"
      fill
      actions={<RssRefreshButton onRefresh={onRefresh} loading={refreshing} />}
    >
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
