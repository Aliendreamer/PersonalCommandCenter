import { createFileRoute } from '@tanstack/react-router'

import { getGoodreads } from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { BookList } from '../../components/book-list'

export const Route = createFileRoute('/_authenticated/goodreads')({
  loader: async () => settle(getGoodreads()),
  component: GoodreadsPage,
})

function GoodreadsPage() {
  const result = Route.useLoaderData()
  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-semibold">Reading</h1>
      <BookList
        books={result.data ?? []}
        error={result.error ? 'unreachable' : undefined}
      />
    </div>
  )
}
