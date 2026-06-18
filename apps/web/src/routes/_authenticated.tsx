import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { Anchor, Group, Text } from '@mantine/core'

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
    <>
      <Group
        gap="sm"
        align="center"
        fz="xs"
        style={{ position: 'fixed', right: 12, top: 8, zIndex: 50 }}
      >
        <Text span fz="xs">
          Hello, {me.email ?? me.subject}
        </Text>
        {me.roles.length > 0 ? (
          <Text span fz="xs" c="dimmed">
            {me.roles.join(', ')}
          </Text>
        ) : null}
        <ThemeToggle />
        <Anchor component="button" type="button" fz="xs" onClick={logout}>
          Logout
        </Anchor>
      </Group>
      <Outlet />
    </>
  )
}
