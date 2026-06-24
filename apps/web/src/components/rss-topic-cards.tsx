import {
  Anchor,
  Box,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import type { RssItem, RssTopic } from '@pcc/contracts'
import { safeHref } from '../lib/safe-href'

export const TOPICS: { key: RssTopic; label: string }[] = [
  { key: 'technology', label: 'Technology' },
  { key: 'bulgaria', label: 'Bulgaria' },
  { key: 'world', label: 'World' },
  { key: 'sports', label: 'Sports' },
]

const CARDS_PER_TOPIC = 10

function when(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function RssCard({ item }: { item: RssItem }) {
  return (
    <Paper withBorder radius="sm" p="xs">
      <Anchor
        href={safeHref(item.link)}
        target="_blank"
        rel="noreferrer noopener"
        size="sm"
        fw={500}
        lineClamp={2}
      >
        {item.title}
      </Anchor>
      <Text size="xs" c="dimmed">
        {item.source}
        {when(item.published) ? ` · ${when(item.published)}` : ''}
      </Text>
      {item.summary ? (
        <Text size="xs" c="dimmed" lineClamp={2} mt={4}>
          {item.summary}
        </Text>
      ) : null}
    </Paper>
  )
}

/** Top cards: one labeled column per topic, newest 10 each. */
export function RssTopicCards({ items }: { items: RssItem[] }) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
      {TOPICS.map(({ key, label }) => {
        const top = items
          .filter((i) => i.topic === key)
          .slice(0, CARDS_PER_TOPIC)
        return (
          <Box key={key}>
            <Title order={4} mb="xs">
              {label}
            </Title>
            {top.length === 0 ? (
              <Text size="sm" c="dimmed">
                No items
              </Text>
            ) : (
              <Stack gap="xs">
                {top.map((item) => (
                  <RssCard key={item.link} item={item} />
                ))}
              </Stack>
            )}
          </Box>
        )
      })}
    </SimpleGrid>
  )
}
