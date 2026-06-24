import type { ReactNode } from 'react'
import { Box, Container, Group, ScrollArea, Title } from '@mantine/core'

export interface PluginPageProps {
  title: string
  /** Optional header actions rendered to the right of the title (e.g. a "New event" button). */
  actions?: ReactNode
  /**
   * Bound the page to the viewport height (below the app header) so it fits the window and does not
   * page-scroll — the content area takes the remaining height instead.
   */
  fill?: boolean
  /**
   * When `fill`, wrap the content in an internal scroll area (the default). Set `false` when the child
   * owns its own scrolling (e.g. a virtualized list).
   */
  scroll?: boolean
  /** Expand the container to the full available width instead of the default lg (~1200px) cap. */
  fluid?: boolean
  children: ReactNode
}

/**
 * Shared chrome for every plugin page: a width-constrained column with the page title (and optional
 * header actions). In `fill` mode the page is bounded to the window height so a long list scrolls
 * inside its own area rather than scrolling the whole page.
 */
export function PluginPage({
  title,
  actions,
  fill,
  scroll = true,
  fluid,
  children,
}: PluginPageProps) {
  const header = (
    <Group justify="space-between" align="center" mb="md" wrap="nowrap">
      <Title order={1} m={0}>
        {title}
      </Title>
      {actions}
    </Group>
  )

  if (!fill) {
    return (
      <Container fluid={fluid} size={fluid ? undefined : 'lg'} px={0}>
        {header}
        {children}
      </Container>
    )
  }

  return (
    <Container
      fluid={fluid}
      size={fluid ? undefined : 'lg'}
      px={0}
      style={{
        // Fit the window: the dynamic viewport height minus the app-shell header and its padding.
        height:
          'calc(100dvh - var(--app-shell-header-height, 56px) - 2 * var(--app-shell-padding, 1rem))',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {header}
      {scroll ? (
        <ScrollArea style={{ flex: 1, minHeight: 0 }} type="auto">
          {children}
        </ScrollArea>
      ) : (
        <Box
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children}
        </Box>
      )}
    </Container>
  )
}
