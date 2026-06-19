import {
  Outlet,
  createFileRoute,
  redirect,
  useRouterState,
} from '@tanstack/react-router'
import { AppShell, Anchor, Burger, Group, Text } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { CircleUser } from 'lucide-react'

import { getMe, getPlugins } from '../lib/server/api'
import { settle } from '../lib/server/api-loaders'
import { logout } from '../lib/auth/session'
import { ThemeToggle } from '../components/theme-toggle'
import { Sidebar } from '../components/sidebar'

/**
 * Whole-app auth gate + persistent app shell. `beforeLoad` runs server-side on SSR (and via RPC on
 * client navigation): it reads the session through the SSR-BFF and, when there is none, hard-redirects
 * to the login proxy. The loader fetches the plugin manifests so the sidebar nav renders on every
 * page. On success the identity is in router context for every child route.
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
  loader: async () => settle(getPlugins()),
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { me } = Route.useRouteContext()
  const plugins = Route.useLoaderData()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [opened, { toggle }] = useDisclosure()

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Burger
            opened={opened}
            onClick={toggle}
            hiddenFrom="sm"
            size="sm"
            aria-label="Toggle navigation"
          />
          <Group gap="md" align="center" ml="auto" wrap="nowrap">
            <Group gap={6} align="center">
              <CircleUser size={18} aria-hidden />
              {/* Show the email when known; never surface the raw subject GUID or internal roles. */}
              <Text span fz="sm">
                {me.email ?? 'Account'}
              </Text>
            </Group>
            <ThemeToggle />
            <Anchor component="button" type="button" fz="sm" onClick={logout}>
              Logout
            </Anchor>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Sidebar manifests={plugins.data ?? []} activePath={pathname} />
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}
