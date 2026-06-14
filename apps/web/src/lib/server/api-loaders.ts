import { isRedirect, redirect } from '@tanstack/react-router'
import type {
  CalendarEvent,
  IotEntity,
  PluginManifest,
  SystemStatus,
} from '@pcc/contracts'

/** The authenticated identity returned by `GET /api/me`. */
export interface Me {
  id: number
  subject: string
  email?: string | null
  roles: string[]
}

export const ADMIN_ROLE = 'Admin'

export function hasRole(me: Me, role: string): boolean {
  return me.roles.includes(role)
}

type FetchLike = typeof fetch

const apiBase = (): string => process.env.API_URL ?? 'http://core-api:8080'

/**
 * Reads the session identity. The `fetchImpl` is the cookie-forwarding server fetch (injectable
 * for tests). Returns `null` on 401 (the `_authenticated` guard turns that into a login redirect);
 * throws on any other non-2xx so a real outage surfaces.
 */
export async function loadMe(fetchImpl: FetchLike): Promise<Me | null> {
  const res = await fetchImpl(`${apiBase()}/api/me`)
  if (res.status === 401) {
    return null
  }
  if (!res.ok) {
    throw new Error(`/api/me failed: ${res.status}`)
  }
  return (await res.json()) as Me
}

/**
 * Fetches a protected resource server-to-server. A 401 (e.g. the session was revoked mid-session)
 * throws a redirect to the SSR login proxy; any other non-2xx throws so the loader can degrade.
 */
async function loadProtected<T>(
  fetchImpl: FetchLike,
  path: string,
): Promise<T> {
  const res = await fetchImpl(`${apiBase()}${path}`)
  if (res.status === 401) {
    throw redirect({ href: '/api/auth/login?returnTo=/' })
  }
  if (!res.ok) {
    throw new Error(`${path} failed: ${res.status}`)
  }
  return (await res.json()) as T
}

export const loadPlugins = (fetchImpl: FetchLike): Promise<PluginManifest[]> =>
  loadProtected<PluginManifest[]>(fetchImpl, '/api/plugins')

export const loadSystemStatus = (fetchImpl: FetchLike): Promise<SystemStatus> =>
  loadProtected<SystemStatus>(fetchImpl, '/api/system/status')

export const loadIotEntities = (fetchImpl: FetchLike): Promise<IotEntity[]> =>
  loadProtected<IotEntity[]>(fetchImpl, '/api/iot/entities')

export const loadCalendarEvents = (
  fetchImpl: FetchLike,
  days?: number,
): Promise<CalendarEvent[]> =>
  loadProtected<CalendarEvent[]>(
    fetchImpl,
    days === undefined
      ? '/api/calendar/events'
      : `/api/calendar/events?days=${days}`,
  )

/** A loaded value or a degraded marker. */
export type Settled<T> =
  | { data: T; error?: false }
  | { data?: undefined; error: true }

/**
 * Resolves a per-tile fetch into data-or-degraded so one plugin's outage (e.g. IoT 502 without an
 * HA token) doesn't break the whole SSR dashboard. Auth redirects are re-thrown, never swallowed,
 * so a revoked session still bounces to login.
 */
export async function settle<T>(promise: Promise<T>): Promise<Settled<T>> {
  try {
    return { data: await promise }
  } catch (error) {
    if (isRedirect(error)) {
      throw error
    }
    return { error: true }
  }
}
