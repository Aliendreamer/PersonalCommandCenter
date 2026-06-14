import { isRedirect, redirect } from '@tanstack/react-router'
import type {
  CalendarEvent,
  CalendarEventInput,
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

/**
 * Sends a protected mutation server-to-server. 401 → login redirect (revoked session); 404 → null
 * (unknown uid); 204/other 2xx → the parsed body or null; anything else throws.
 */
async function sendProtected<T>(
  fetchImpl: FetchLike,
  method: string,
  path: string,
  body?: unknown,
): Promise<T | null> {
  const res = await fetchImpl(`${apiBase()}${path}`, {
    method,
    headers:
      body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (res.status === 401) {
    throw redirect({ href: '/api/auth/login?returnTo=/' })
  }
  if (res.status === 404) {
    return null
  }
  if (!res.ok) {
    throw new Error(`${path} failed: ${res.status}`)
  }
  if (res.status === 204) {
    return null
  }
  return (await res.json()) as T
}

export const postCalendarEvent = (
  fetchImpl: FetchLike,
  input: CalendarEventInput,
) =>
  sendProtected<CalendarEvent>(fetchImpl, 'POST', '/api/calendar/events', input)

export const putCalendarEvent = (
  fetchImpl: FetchLike,
  uid: string,
  input: CalendarEventInput,
) =>
  sendProtected<CalendarEvent>(
    fetchImpl,
    'PUT',
    `/api/calendar/events/${uid}`,
    input,
  )

export const removeCalendarEvent = (fetchImpl: FetchLike, uid: string) =>
  sendProtected<null>(fetchImpl, 'DELETE', `/api/calendar/events/${uid}`)

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
