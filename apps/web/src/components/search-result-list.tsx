import { Anchor, Box, Stack, Text } from '@mantine/core'
import type { SearchResult } from '@pcc/contracts'
import { safeHref } from '../lib/safe-href'

export interface SearchResultListProps {
  results: SearchResult[]
  error?: string
  /** No query entered yet (vs. an empty result set). */
  idle?: boolean
}

/** Lists metasearch results; degrades on error and shows prompts for idle/empty. */
export function SearchResultList({
  results,
  error,
  idle,
}: SearchResultListProps) {
  if (error) {
    return (
      <Text role="status" size="sm" c="yellow.7">
        Search unavailable
      </Text>
    )
  }

  if (idle) {
    return (
      <Text size="sm" c="dimmed">
        Enter a query to search.
      </Text>
    )
  }

  if (results.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No results
      </Text>
    )
  }

  return (
    <Stack component="ul" gap="md" m={0} p={0} style={{ listStyle: 'none' }}>
      {results.map((r) => (
        <Box component="li" key={r.url}>
          <Anchor
            href={safeHref(r.url)}
            target="_blank"
            rel="noreferrer noopener"
          >
            {r.title}
          </Anchor>
          {r.content && (
            <Text size="sm" c="dimmed">
              {r.content}
            </Text>
          )}
          <Text size="xs" c="dimmed" truncate>
            {r.url}
            {r.engine ? ` · ${r.engine}` : ''}
          </Text>
        </Box>
      ))}
    </Stack>
  )
}
