import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import type { CalendarEventInput } from '@pcc/contracts'

import { cookiesAreSecure, forwardCookieHeader } from './cookies'
import {
  loadCalendarEvents,
  loadIotEntities,
  loadMe,
  loadPlugins,
  loadSystemStatus,
  postCalendarEvent,
  putCalendarEvent,
  removeCalendarEvent,
} from './api-loaders'

/**
 * A server-side `fetch` that re-attaches the browser's session cookie (mapped back to the API
 * names) so calls to core-api run authenticated over the internal compose network. The browser
 * never reaches core-api directly — these run only inside `createServerFn` handlers (on SSR, or
 * via RPC to this SSR server on client navigation).
 */
function serverFetch(): typeof fetch {
  const secure = cookiesAreSecure()
  const cookie = forwardCookieHeader(getRequestHeader('cookie'), secure)
  return (input, init) => {
    const headers = new Headers(init?.headers)
    if (cookie) {
      headers.set('cookie', cookie)
    }
    return fetch(input, { ...init, headers })
  }
}

export const getMe = createServerFn({ method: 'GET' }).handler(() =>
  loadMe(serverFetch()),
)

export const getPlugins = createServerFn({ method: 'GET' }).handler(() =>
  loadPlugins(serverFetch()),
)

export const getSystemStatus = createServerFn({ method: 'GET' }).handler(() =>
  loadSystemStatus(serverFetch()),
)

export const getIotEntities = createServerFn({ method: 'GET' }).handler(() =>
  loadIotEntities(serverFetch()),
)

export const getCalendarEvents = createServerFn({ method: 'GET' }).handler(() =>
  loadCalendarEvents(serverFetch()),
)

// Mutations: the RPC transport is POST regardless of the underlying core-api method; the handler
// re-attaches the cookie and calls core-api with the right verb. The browser only talks to app.
export const createCalendarEvent = createServerFn({ method: 'POST' })
  .validator((input: CalendarEventInput) => input)
  .handler(({ data }) => postCalendarEvent(serverFetch(), data))

export const updateCalendarEvent = createServerFn({ method: 'POST' })
  .validator((input: { uid: string; event: CalendarEventInput }) => input)
  .handler(({ data }) => putCalendarEvent(serverFetch(), data.uid, data.event))

export const deleteCalendarEvent = createServerFn({ method: 'POST' })
  .validator((uid: string) => uid)
  .handler(({ data }) => removeCalendarEvent(serverFetch(), data))
