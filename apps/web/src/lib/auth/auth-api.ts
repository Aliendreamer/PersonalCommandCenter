import { API_ORIGIN, loginUrl, logoutUrl } from '../api'

export interface Me {
  id: number
  subject: string
  email?: string | null
  roles: string[]
}

export const ADMIN_ROLE = 'Admin'

/** Probes the session. Returns null when not signed in (401); throws on other errors. */
export async function fetchMe(): Promise<Me | null> {
  const response = await fetch(`${API_ORIGIN}/api/me`, {
    credentials: 'include',
  })
  if (response.status === 401) return null
  if (!response.ok) throw new Error(`/me failed: ${response.status}`)
  return (await response.json()) as Me
}

export function login(returnTo: string): void {
  window.location.assign(loginUrl(returnTo))
}

export function logout(): void {
  window.location.assign(logoutUrl())
}

export function hasRole(me: Me, role: string): boolean {
  return me.roles.includes(role)
}
