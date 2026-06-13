import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { fetchMe, login, logout } from './auth-api'
import type { Me } from './auth-api'

interface AuthValue {
  me: Me
}

const AuthContext = createContext<AuthValue | null>(null)

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}

type State =
  | { status: 'loading' }
  | { status: 'authed'; me: Me }
  | { status: 'anon' }

/**
 * Whole-app gate. Probes `/api/me` on the client; renders the app only when signed in,
 * otherwise redirects to the API login. SSR renders the loading state (no cookie on the
 * FE server), so there is no SSR 401 loop.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let active = true
    fetchMe()
      .then((me) => {
        if (!active) return
        if (me) {
          setState({ status: 'authed', me })
        } else {
          setState({ status: 'anon' })
          login(window.location.pathname + window.location.search)
        }
      })
      .catch(() => {
        if (active) setState({ status: 'anon' })
      })
    return () => {
      active = false
    }
  }, [])

  if (state.status === 'loading') {
    return <p className="p-6 text-sm text-gray-500">Loading…</p>
  }
  if (state.status === 'anon') {
    return <p className="p-6 text-sm text-gray-500">Redirecting to sign in…</p>
  }

  return (
    <AuthContext.Provider value={{ me: state.me }}>
      <div className="fixed right-3 top-2 z-50 flex items-center gap-3 text-xs">
        <span>Hello, {state.me.email ?? state.me.subject}</span>
        {state.me.roles.length > 0 ? (
          <span className="text-gray-500">{state.me.roles.join(', ')}</span>
        ) : null}
        <button type="button" onClick={logout} className="underline">
          Logout
        </button>
      </div>
      {children}
    </AuthContext.Provider>
  )
}
