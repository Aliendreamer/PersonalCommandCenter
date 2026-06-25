import { useMemo, useState } from 'react'
import {
  Anchor,
  Badge,
  Box,
  Chip,
  Group,
  Paper,
  Select,
  Stack,
  Text,
} from '@mantine/core'
import type { RssItem, RssTopic } from '@pcc/contracts'
import { safeHref } from '../lib/safe-href'
import { TOPICS } from './rss-topic-cards'

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

/** Lists feed items newest-first with Topic + Source filters; degrades on error. */
export function RssItemList({ items, error }: RssItemListProps) {
  const [topic, setTopic] = useState<RssTopic | 'all'>('all')
  const [source, setSource] = useState<string | null>(null)

  const sources = useMemo(
    () => [...new Set(items.map((i) => i.source))].sort(),
    [items],
  )

  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          (topic === 'all' || i.topic === topic) &&
          (source === null || i.source === source),
      ),
    [items, topic, source],
  )

  if (error) {
    return (
      <Text role="status" size="sm" c="yellow.7">
        Feeds unavailable
      </Text>
    )
  }

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="flex-end">
        <Chip.Group multiple={false} value={topic} onChange={setTopic}>
          <Group gap="xs">
            <Chip value="all">All</Chip>
            {TOPICS.map(({ key, label }) => (
              <Chip key={key} value={key}>
                {label}
              </Chip>
            ))}
          </Group>
        </Chip.Group>
        <Select
          aria-label="Filter by source"
          placeholder="All sources"
          clearable
          data={sources}
          value={source}
          onChange={setSource}
          size="xs"
          w={200}
        />
      </Group>

      {filtered.length === 0 ? (
        <Text size="sm" c="dimmed">
          No items
        </Text>
      ) : (
        <Paper withBorder radius="md">
          <Box component="ul" m={0} p={0} style={{ listStyle: 'none' }}>
            {filtered.map((item, i) => (
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
                <Group gap={6} mt={2}>
                  <Badge
                    size="xs"
                    variant="light"
                    radius="sm"
                    maw={180}
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.source}
                  </Badge>
                  {when(item.published) && (
                    <Text size="xs" c="dimmed">
                      {when(item.published)}
                    </Text>
                  )}
                </Group>
              </Box>
            ))}
          </Box>
        </Paper>
      )}
    </Stack>
  )
}
