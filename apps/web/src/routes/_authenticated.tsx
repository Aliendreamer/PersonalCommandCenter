import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { Anchor, Box, Group, Text } from '@mantine/core'
import { CircleUser } from 'lucide-react'

import { getMe } from '../lib/server/api'
import { logout } from '../lib/auth/session'
import { ThemeToggle } from '../components/theme-toggle'

/**
 * Whole-app auth gate. `beforeLoad` runs server-side on SSR (and via RPC on client navigation):
 * it reads the session through the SSR-BFF and, when there is none, hard-redirects to the login
 * proxy. On success it puts the identity into router context for every child route.
 */
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    const me = await getMe()
    if (!me) {
      throw redirect({
        href: `/api/auth/login?returnTo=${encodeURIComponent(location.href)}`,
      })
    }
    return { me }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { me } = Route.useRouteContext()
  return (
    <Box
      style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}
    >
      <Box
        component="header"
        px="lg"
        py="xs"
        style={{
          borderBottom: '1px solid var(--mantine-color-default-border)',
          background: 'var(--mantine-color-body)',
        }}
      >
        <Group justify="flex-end" gap="md" align="center">
          <Group gap={6} align="center">
            <CircleUser size={18} aria-hidden />
            {/* Show the email when known; never surface the raw subject GUID. */}
            <Text span fz="sm">
              {me.email ?? 'Account'}
            </Text>
            {me.roles.length > 0 ? (
              <Text span fz="xs" c="dimmed">
                ({me.roles.join(', ')})
              </Text>
            ) : null}
          </Group>
          <ThemeToggle />
          <Anchor component="button" type="button" fz="sm" onClick={logout}>
            Logout
          </Anchor>
        </Group>
      </Box>
      <Box
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  )
}
