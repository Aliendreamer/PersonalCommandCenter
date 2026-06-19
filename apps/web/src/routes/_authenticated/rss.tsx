import { createFileRoute } from '@tanstack/react-router'

import { getRss } from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { RssItemList } from '../../components/rss-item-list'
import { PluginPage } from '../../components/plugin-page'

export const Route = createFileRoute('/_authenticated/rss')({
  loader: async () => settle(getRss()),
  component: RssPage,
})

function RssPage() {
  const result = Route.useLoaderData()
  return (
    <PluginPage title="Feeds">
      <RssItemList
        items={result.data ?? []}
        error={result.error ? 'unreachable' : undefined}
      />
    </PluginPage>
  )
}
