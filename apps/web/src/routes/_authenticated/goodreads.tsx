import { createFileRoute } from '@tanstack/react-router'
import { Box, Title } from '@mantine/core'

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
    <Box p="lg">
      <Title order={1} mb="md">
        Reading
      </Title>
      <BookList
        books={result.data ?? []}
        error={result.error ? 'unreachable' : undefined}
      />
    </Box>
  )
}
