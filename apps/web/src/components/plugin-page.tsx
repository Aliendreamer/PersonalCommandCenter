import type { ReactNode } from 'react'
import { Container, Group, Title } from '@mantine/core'

export interface PluginPageProps {
  title: string
  /** Optional header actions rendered to the right of the title (e.g. a "New event" button). */
  actions?: ReactNode
  children: ReactNode
}

/**
 * Shared chrome for every plugin page: a width-constrained column with the page title (and optional
 * header actions), so content reads as a tidy column inside the app shell rather than stretching the
 * full viewport.
 */
export function PluginPage({ title, actions, children }: PluginPageProps) {
  return (
    <Container size="lg" px={0}>
      <Group justify="space-between" align="center" mb="md" wrap="nowrap">
        <Title order={1} m={0}>
          {title}
        </Title>
        {actions}
      </Group>
      {children}
    </Container>
  )
}
