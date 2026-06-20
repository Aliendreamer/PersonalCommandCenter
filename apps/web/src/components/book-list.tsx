import { useState } from 'react'
import {
  Anchor,
  Badge,
  Group,
  Image,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core'
import type { Book } from '@pcc/contracts'
import { safeHref } from '../lib/safe-href'
import { stripHtml } from '../lib/strip-html'

export interface BookListProps {
  books: Book[]
  error?: string
}

const cardBorder =
  '2px solid light-dark(var(--mantine-color-gray-5), var(--mantine-color-dark-3))'

/** Grid of book tiles; clicking one opens an in-app detail modal (data from the shelf RSS). */
export function BookList({ books, error }: BookListProps) {
  const [selected, setSelected] = useState<Book | null>(null)

  if (error) {
    return (
      <Text role="status" size="sm" c="yellow.7">
        Reading list unavailable
      </Text>
    )
  }

  if (books.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No books
      </Text>
    )
  }

  return (
    <>
      <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
        {books.map((book) => (
          <UnstyledButton
            key={book.link}
            data-testid={`book-tile-${book.link}`}
            onClick={() => setSelected(book)}
          >
            <Paper
              radius="md"
              p="sm"
              shadow="xs"
              style={{ border: cardBorder }}
            >
              <Group gap="sm" wrap="nowrap" align="flex-start">
                {book.coverUrl ? (
                  <Image
                    src={safeHref(book.coverUrl)}
                    alt={book.title}
                    w={48}
                    h={70}
                    radius="sm"
                    fit="cover"
                    flex="none"
                  />
                ) : null}
                <div style={{ minWidth: 0 }}>
                  <Text fw={500} size="sm" lineClamp={2} ta="left">
                    {book.title}
                  </Text>
                  {book.author ? (
                    <Text size="xs" c="dimmed" mt={2} ta="left">
                      {book.author}
                    </Text>
                  ) : null}
                </div>
              </Group>
            </Paper>
          </UnstyledButton>
        ))}
      </SimpleGrid>

      <Modal
        opened={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.title}
        size="lg"
        centered
        transitionProps={{ duration: 0 }}
      >
        {selected ? <BookDetail book={selected} /> : null}
      </Modal>
    </>
  )
}

function BookDetail({ book }: { book: Book }) {
  const meta = [
    book.averageRating != null ? `★ ${book.averageRating.toFixed(2)}` : null,
    book.numPages != null ? `${book.numPages} pages` : null,
    book.published != null ? `${book.published}` : null,
  ].filter((x): x is string => x !== null)

  return (
    <Group align="flex-start" gap="md" wrap="nowrap">
      {book.coverUrl ? (
        <Image
          src={safeHref(book.coverUrl)}
          alt={book.title}
          w={110}
          radius="sm"
          fit="contain"
          flex="none"
        />
      ) : null}
      <Stack gap="xs" style={{ minWidth: 0 }}>
        {book.author ? (
          <Text size="sm" c="dimmed">
            {book.author}
          </Text>
        ) : null}
        {meta.length > 0 ? (
          <Group gap="xs">
            {meta.map((m) => (
              <Badge key={m} variant="light" color="sky">
                {m}
              </Badge>
            ))}
          </Group>
        ) : null}
        {book.description ? (
          <Text size="sm">{stripHtml(book.description)}</Text>
        ) : (
          <Text size="sm" c="dimmed">
            No description.
          </Text>
        )}
        <Anchor
          href={safeHref(book.link)}
          target="_blank"
          rel="noreferrer noopener"
          size="sm"
        >
          View on Goodreads
        </Anchor>
      </Stack>
    </Group>
  )
}
