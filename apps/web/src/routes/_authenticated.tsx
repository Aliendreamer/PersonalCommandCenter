import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

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
      <div className="fixed right-3 top-2 z-50 flex items-center gap-3 text-xs">
        <span>Hello, {me.email ?? me.subject}</span>
        {me.roles.length > 0 ? (
          <span className="text-muted-foreground">{me.roles.join(', ')}</span>
        ) : null}
        <ThemeToggle />
        <button type="button" onClick={logout} className="underline">
          Logout
        </button>
      </div>
      <Outlet />
    </>
  )
}
