import { createFileRoute } from '@tanstack/react-router'

import { getGoodreads } from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { BookList } from '../../components/book-list'
import { PluginPage } from '../../components/plugin-page'

export const Route = createFileRoute('/_authenticated/goodreads')({
  loader: async () => settle(getGoodreads()),
  component: GoodreadsPage,
})

function GoodreadsPage() {
  const result = Route.useLoaderData()
  return (
    <PluginPage title="Reading">
      <BookList
        books={result.data ?? []}
        error={result.error ? 'unreachable' : undefined}
      />
    </PluginPage>
  )
}
