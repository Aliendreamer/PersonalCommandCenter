import type { ReactNode } from 'react'
import {
  Alert,
  Anchor,
  Box,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Title,
} from '@mantine/core'
import type { PluginManifest } from '@pcc/contracts'

export interface PluginShellProps {
  manifests: PluginManifest[]
  error?: string
  /** Optional renderer for a plugin's dashboard tile body (e.g. the live system status). */
  renderTile?: (manifest: PluginManifest) => ReactNode
}

/**
 * The dashboard shell: renders a nav entry and a dashboard tile for each enabled plugin.
 * Plugins absent from the manifest are not rendered. A manifest-load failure surfaces a
 * non-blocking error banner instead of breaking the page.
 */
export function PluginShell({
  manifests,
  error,
  renderTile,
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
          {manifests.map((manifest) => (
            <Anchor key={manifest.id} href={manifest.routeBase} size="sm">
              {manifest.navLabel}
            </Anchor>
          ))}
        </Stack>
      </Box>
      <Box component="main" flex={1} p="lg">
        {error ? (
          <Alert role="alert" color="yellow" mb="md">
            Some data could not be loaded: {error}
          </Alert>
        ) : null}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {manifests.map((manifest) => (
            <Paper
              key={manifest.id}
              component="section"
              data-testid={`tile-${manifest.id}`}
              withBorder
              radius="md"
              p="md"
            >
              <Title order={3} size="h5" mb="xs">
                {manifest.navLabel}
              </Title>
              {renderTile?.(manifest)}
            </Paper>
          ))}
        </SimpleGrid>
      </Box>
    </Group>
  )
}
