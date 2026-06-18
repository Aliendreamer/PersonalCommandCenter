import { Anchor, Box, Paper, Text } from '@mantine/core'
import type { RssItem } from '@pcc/contracts'
import { safeHref } from '../lib/safe-href'

export interface RssItemListProps {
  items: RssItem[]
  error?: string
}

function when(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const rowBorder = (i: number) =>
  i > 0
    ? { borderTop: '1px solid var(--mantine-color-default-border)' }
    : undefined

/** Lists feed items newest-first (title links out, with source + date); degrades on error. */
export function RssItemList({ items, error }: RssItemListProps) {
  if (error) {
    return (
      <Text role="status" size="sm" c="yellow.7">
        Feeds unavailable
      </Text>
    )
  }

  if (items.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No items
      </Text>
    )
  }

  return (
    <Paper withBorder radius="md">
      <Box component="ul" m={0} p={0} style={{ listStyle: 'none' }}>
        {items.map((item, i) => (
          <Box
            component="li"
            key={item.link}
            px="sm"
            py="xs"
            style={rowBorder(i)}
          >
            <Anchor
              href={safeHref(item.link)}
              target="_blank"
              rel="noreferrer noopener"
              size="sm"
            >
              {item.title}
            </Anchor>
            <Text size="xs" c="dimmed">
              {item.source}
              {when(item.published) ? ` · ${when(item.published)}` : ''}
            </Text>
          </Box>
        ))}
      </Box>
    </Paper>
  )
}
