import { Anchor, Group, Image, Paper, SimpleGrid, Text } from '@mantine/core'
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
        <Paper
          component="li"
          key={book.link}
          withBorder
          radius="md"
          p="sm"
          shadow="xs"
        >
          <Group gap="sm" wrap="nowrap" align="flex-start">
            {book.coverUrl ? (
              <Anchor
                href={safeHref(book.link)}
                target="_blank"
                rel="noreferrer noopener"
                flex="none"
                style={{ lineHeight: 0 }}
              >
                <Image
                  src={safeHref(book.coverUrl)}
                  alt={book.title}
                  w={48}
                  h={70}
                  radius="sm"
                  fit="cover"
                />
              </Anchor>
            ) : null}
            <div style={{ minWidth: 0 }}>
              <Anchor
                href={safeHref(book.link)}
                target="_blank"
                rel="noreferrer noopener"
                fw={500}
                size="sm"
                lineClamp={2}
              >
                {book.title}
              </Anchor>
              {book.author ? (
                <Text size="xs" c="dimmed" mt={2}>
                  {book.author}
                </Text>
              ) : null}
            </div>
          </Group>
        </Paper>
      ))}
    </SimpleGrid>
  )
}
