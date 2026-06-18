import type { ReactNode } from 'react'
import {
  Alert,
  Anchor,
  Box,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core'
import {
  Activity,
  Bell,
  BookOpen,
  Boxes,
  Calendar,
  Cloud,
  Code2,
  Cpu,
  LayoutGrid,
  ListChecks,
  Rss,
  Search,
  Server,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { PluginManifest } from '@pcc/contracts'

import { healthColor } from '../lib/health'
import type { Health } from '../lib/health'

/** Per-plugin nav/tile icon (keyed by manifest id), with a generic fallback. */
const ICONS: Record<string, LucideIcon> = {
  system: Server,
  iot: Cpu,
  calendar: Calendar,
  tasks: ListChecks,
  notifications: Bell,
  search: Search,
  weather: Cloud,
  rss: Rss,
  goodreads: BookOpen,
  uptime: Activity,
  models: Boxes,
  coding: Code2,
}

function iconFor(id: string): LucideIcon {
  return ICONS[id] ?? LayoutGrid
}

export interface PluginShellProps {
  manifests: PluginManifest[]
  error?: string
  /** Optional renderer for a plugin's dashboard tile body (e.g. the live system status). */
  renderTile?: (manifest: PluginManifest) => ReactNode
  /** Per-tile health for the accent bar + status dot; defaults to `ok` when not supplied. */
  tileHealth?: (manifest: PluginManifest) => Health
  /** The status-board hero strip, rendered above the tile grid. */
  hero?: ReactNode
}

/**
 * The status board: a vertical plugin nav and a symmetric uniform card grid, with an optional hero
 * strip above the grid. Each card carries a left health-accent bar and an icon + title + status-dot
 * header. The layout is fixed — tiles are never reordered; health shows as color. A manifest-load
 * failure surfaces a non-blocking banner instead of breaking the page.
 */
export function PluginShell({
  manifests,
  error,
  renderTile,
  tileHealth,
  hero,
}: PluginShellProps) {
  return (
    <Group align="stretch" gap={0} wrap="nowrap" mih="100vh">
      <Box
        component="nav"
        aria-label="Plugins"
        w={192}
        p="md"
        style={{
          flex: 'none',
          borderRight: '1px solid var(--mantine-color-default-border)',
        }}
      >
        <Stack gap="xs">
          {manifests.map((manifest) => {
            const Icon = iconFor(manifest.id)
            return (
              <Anchor key={manifest.id} href={manifest.routeBase} size="sm">
                <Group gap="xs" wrap="nowrap" align="center">
                  <Icon size={16} aria-hidden />
                  {manifest.navLabel}
                </Group>
              </Anchor>
            )
          })}
        </Stack>
      </Box>
      <Box component="main" flex={1} p="lg">
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
            return (
              <Paper
                key={manifest.id}
                component="section"
                data-testid={`tile-${manifest.id}`}
                withBorder
                radius="md"
                p="md"
                shadow="xs"
                style={{
                  borderLeft: `3px solid var(--mantine-color-${color}-6)`,
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
    </Group>
  )
}
