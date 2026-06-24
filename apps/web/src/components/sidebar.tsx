import { Anchor, Divider, Group, NavLink, Stack, Title } from '@mantine/core'
import { LayoutDashboard } from 'lucide-react'
import type { PluginManifest } from '@pcc/contracts'

import { iconFor } from '../lib/plugin-icons'

export interface SidebarProps {
  manifests: PluginManifest[]
  /** Current route path; the active nav entry is highlighted. Supplied by the layout (testable). */
  activePath?: string
}

/** The persistent plugin navigation: a brand link home + one NavLink per enabled plugin. */
export function Sidebar({ manifests, activePath }: SidebarProps) {
  const isActive = (base: string) =>
    activePath === base || (!!activePath && activePath.startsWith(`${base}/`))

  return (
    <Stack gap="md" h="100%">
      <Anchor href="/" underline="never" c="inherit">
        <Group gap="xs" align="center" px="xs">
          <LayoutDashboard size={20} aria-hidden />
          <Title order={2} size="h5" m={0}>
            Command Center
          </Title>
        </Group>
      </Anchor>
      <Divider />
      <Stack gap={4} component="nav" aria-label="Plugins">
        {manifests.filter((m) => m.id !== 'weather').map((manifest) => {
          const Icon = iconFor(manifest.id)
          return (
            <NavLink
              key={manifest.id}
              component="a"
              href={manifest.routeBase}
              label={manifest.navLabel}
              active={isActive(manifest.routeBase)}
              leftSection={<Icon size={18} aria-hidden />}
              styles={{
                root: { borderRadius: 'var(--mantine-radius-md)' },
                label: { fontSize: 'var(--mantine-font-size-sm)' },
              }}
            />
          )
        })}
      </Stack>
    </Stack>
  )
}
