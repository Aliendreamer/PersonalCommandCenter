import { Anchor, Group, Image, SimpleGrid, Text } from '@mantine/core'
import type { Book } from '@pcc/contracts'
import { safeHref } from '../lib/safe-href'

export interface BookListProps {
  books: Book[]
  error?: string
}

/** Lists the current shelf as cover + title + author; titles link out. Degrades on error. */
export function BookList({ books, error }: BookListProps) {
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
    <SimpleGrid
      component="ul"
      cols={{ base: 2, sm: 3 }}
      spacing="md"
      m={0}
      p={0}
      style={{ listStyle: 'none' }}
    >
      {books.map((book) => (
        <Group
          component="li"
          key={book.link}
          gap="xs"
          wrap="nowrap"
          align="flex-start"
        >
          {book.coverUrl ? (
            <Image
              src={safeHref(book.coverUrl)}
              alt=""
              w={44}
              h={64}
              radius="sm"
              fit="cover"
              flex="none"
            />
          ) : null}
          <div style={{ minWidth: 0 }}>
            <Anchor
              href={safeHref(book.link)}
              target="_blank"
              rel="noreferrer noopener"
              fw={500}
              size="sm"
            >
              {book.title}
            </Anchor>
            {book.author ? (
              <Text size="xs" c="dimmed">
                {book.author}
              </Text>
            ) : null}
          </div>
        </Group>
      ))}
    </SimpleGrid>
  )
}
