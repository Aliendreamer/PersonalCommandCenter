import { useEffect, useState } from 'react'
import { Box, Group, Stack, Text, Title } from '@mantine/core'

import { healthColor, healthCount } from '../lib/health'
import type { Health } from '../lib/health'

export interface DashboardHeroProps {
  healths: Health[]
  /** Controlled clock for tests; when omitted the hero uses a live client-side clock. */
  now?: Date
}

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

/**
 * The status-board hero strip: greeting + date/time and an aggregate health readout (green tiles
 * over total). Presentation-only; the page derives `healths` once and feeds both the hero and the
 * tiles. Time is client-side (a live clock) to avoid SSR/locale hydration skew.
 */
export function DashboardHero({ healths, now }: DashboardHeroProps) {
  const [clock, setClock] = useState<Date | undefined>(now)

  useEffect(() => {
    if (now) {
      return
    }
    setClock(new Date())
    const id = setInterval(() => setClock(new Date()), 60_000)
    return () => clearInterval(id)
  }, [now])

  const { ok, total } = healthCount(healths)
  const allOk = total > 0 && ok === total
  const summaryColor = healthColor(allOk ? 'ok' : 'degraded')

  return (
    <Box
      component="section"
      aria-label="Status summary"
      p="md"
      mb="md"
      style={{
        border:
          '2px solid light-dark(var(--mantine-color-gray-5), var(--mantine-color-dark-3))',
        borderRadius: 'var(--mantine-radius-md)',
        background: 'var(--mantine-color-default-hover)',
      }}
    >
      <Group justify="space-between" align="center" wrap="wrap">
        <Stack gap={2}>
          <Title order={2} size="h4">
            {greeting((clock ?? new Date()).getHours())}
          </Title>
          <Text size="sm" c="dimmed">
            {clock
              ? clock.toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                }) +
                ' · ' +
                clock.toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : ' '}
          </Text>
        </Stack>
        <Group gap="xs" align="center">
          <Box
            w={10}
            h={10}
            style={{
              borderRadius: '50%',
              background: `var(--mantine-color-${summaryColor}-6)`,
            }}
          />
          <Text fw={600}>
            {allOk ? 'All systems healthy' : `${total - ok} need attention`}
          </Text>
          <Text c="dimmed">
            {ok} / {total}
          </Text>
        </Group>
      </Group>
    </Box>
  )
}
