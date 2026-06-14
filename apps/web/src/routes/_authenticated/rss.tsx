import { createFileRoute } from '@tanstack/react-router'

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
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-semibold">Feeds</h1>
      <RssItemList
        items={result.data ?? []}
        error={result.error ? 'unreachable' : undefined}
      />
    </div>
  )
}
