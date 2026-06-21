import type { ReactNode } from 'react'
import { Alert, Box, Group, Paper, SimpleGrid, Text } from '@mantine/core'
import type { PluginManifest } from '@pcc/contracts'

import { healthColor } from '../lib/health'
import type { Health } from '../lib/health'
import { iconFor } from '../lib/plugin-icons'

export interface DashboardGridProps {
  manifests: PluginManifest[]
  error?: string
  /** Optional renderer for a plugin's dashboard tile body (e.g. the live system status). */
  renderTile?: (manifest: PluginManifest) => ReactNode
  /** Per-tile health for the accent bar + status dot; defaults to `ok` when not supplied. */
  tileHealth?: (manifest: PluginManifest) => Health
  /**
   * Optional link target for a tile. When it returns a path the whole card becomes a navigation
   * anchor to that page; when it returns `undefined` the card is a plain section (e.g. the search
   * tile, which owns its own input and can't be wrapped in an anchor).
   */
  tileHref?: (manifest: PluginManifest) => string | undefined
  /** The status-board hero strip, rendered above the tile grid. */
  hero?: ReactNode
}

/**
 * The dashboard status board: an optional hero strip above a symmetric uniform card grid. Each card
 * carries a left health-accent bar and an icon + title + status-dot header; the layout is fixed
 * (tiles are never reordered — health shows as color). A manifest-load failure surfaces a
 * non-blocking banner instead of breaking the page. The nav lives in the persistent app shell.
 */
export function DashboardGrid({
  manifests,
  error,
  renderTile,
  tileHealth,
  tileHref,
  hero,
}: DashboardGridProps) {
  return (
    <Box>
      {error ? (
        <Alert role="alert" color="yellow" mb="md">
          Some data could not be loaded: {error}
        </Alert>
      ) : null}
      {hero}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {manifests.map((manifest) => {
          const Icon = iconFor(manifest.id)
          const health = tileHealth?.(manifest) ?? 'ok'
          const color = healthColor(health)
          const href = tileHref?.(manifest)
          // The whole card is a navigation anchor when a href is supplied; otherwise a plain section.
          const linkProps = href
            ? ({ component: 'a', href } as const)
            : ({ component: 'section' } as const)
          return (
            <Paper
              key={manifest.id}
              {...linkProps}
              data-testid={`tile-${manifest.id}`}
              radius="md"
              p="md"
              shadow="xs"
              style={{
                border:
                  '2px solid light-dark(var(--mantine-color-gray-5), var(--mantine-color-dark-3))',
                borderLeft: `4px solid var(--mantine-color-${color}-6)`,
                ...(href
                  ? {
                      color: 'inherit',
                      textDecoration: 'none',
                      cursor: 'pointer',
                      display: 'block',
                    }
                  : {}),
              }}
            >
              <Group
                justify="space-between"
                align="center"
                mb="xs"
                wrap="nowrap"
              >
                <Group gap="xs" align="center" wrap="nowrap">
                  <Icon size={18} aria-hidden />
                  <Text fw={600} size="sm">
                    {manifest.navLabel}
                  </Text>
                </Group>
                <Box
                  data-testid={`health-${manifest.id}`}
                  data-health={health}
                  w={10}
                  h={10}
                  style={{
                    flex: 'none',
                    borderRadius: '50%',
                    background: `var(--mantine-color-${color}-6)`,
                  }}
                />
              </Group>
              {renderTile?.(manifest)}
            </Paper>
          )
        })}
      </SimpleGrid>
    </Box>
  )
}
