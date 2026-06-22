import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'

import type { CalendarEventInput, CodingRange, TodoInput } from '@pcc/contracts'

import { cookiesAreSecure, forwardCookieHeader } from './cookies'
import {
  loadCalendarEvents,
  loadCalendarEventsRange,
  loadCalendarSources,
  loadCoding,
  loadGoodreads,
  loadModels,
  loadUptime,
  loadIotEntities,
  loadMe,
  loadPlugins,
  loadNotifications,
  loadRss,
  loadSearch,
  loadWeather,
  loadSystemStatus,
  loadTasks,
  postCalendarEvent,
  postMarkAllNotificationsRead,
  postMarkNotificationRead,
  postTask,
  putCalendarEvent,
  putTask,
  removeCalendarEvent,
  removeTask,
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

export const getCalendarEventsRange = createServerFn({ method: 'GET' })
  .validator((range: { from: string; to: string }) => range)
  .handler(({ data }) =>
    loadCalendarEventsRange(serverFetch(), data.from, data.to),
  )

export const getTasks = createServerFn({ method: 'GET' }).handler(() =>
  loadTasks(serverFetch()),
)

export const createTask = createServerFn({ method: 'POST' })
  .validator((input: TodoInput) => input)
  .handler(({ data }) => postTask(serverFetch(), data))

export const updateTask = createServerFn({ method: 'POST' })
  .validator((input: { uid: string; task: TodoInput }) => input)
  .handler(({ data }) => putTask(serverFetch(), data.uid, data.task))

export const deleteTask = createServerFn({ method: 'POST' })
  .validator((uid: string) => uid)
  .handler(({ data }) => removeTask(serverFetch(), data))

export const getNotifications = createServerFn({ method: 'GET' }).handler(() =>
  loadNotifications(serverFetch()),
)

export const markNotificationRead = createServerFn({ method: 'POST' })
  .validator((id: string) => id)
  .handler(({ data }) => postMarkNotificationRead(serverFetch(), data))

export const markAllNotificationsRead = createServerFn({
  method: 'POST',
}).handler(() => postMarkAllNotificationsRead(serverFetch()))

export const getSearch = createServerFn({ method: 'GET' })
  .validator((q: string) => q)
  .handler(({ data }) => loadSearch(serverFetch(), data))

export const getWeather = createServerFn({ method: 'GET' }).handler(() =>
  loadWeather(serverFetch()),
)

export const getRss = createServerFn({ method: 'GET' }).handler(() =>
  loadRss(serverFetch()),
)

export const getGoodreads = createServerFn({ method: 'GET' }).handler(() =>
  loadGoodreads(serverFetch()),
)

export const getUptime = createServerFn({ method: 'GET' }).handler(() =>
  loadUptime(serverFetch()),
)

export const getModels = createServerFn({ method: 'GET' }).handler(() =>
  loadModels(serverFetch()),
)

export const getCoding = createServerFn({ method: 'GET' })
  .validator((range: CodingRange) => range)
  .handler(({ data }) => loadCoding(serverFetch(), data))

// Mutations: the RPC transport is POST regardless of the underlying core-api method; the handler
// re-attaches the cookie and calls core-api with the right verb. The browser only talks to app.
export const createCalendarEvent = createServerFn({ method: 'POST' })
  .validator((input: CalendarEventInput) => input)
  .handler(({ data }) => postCalendarEvent(serverFetch(), data))

export const updateCalendarEvent = createServerFn({ method: 'POST' })
  .validator(
    (input: { uid: string; event: CalendarEventInput; source?: string }) =>
      input,
  )
  .handler(({ data }) =>
    putCalendarEvent(serverFetch(), data.uid, data.event, data.source),
  )

export const deleteCalendarEvent = createServerFn({ method: 'POST' })
  .validator((input: { uid: string; source?: string }) => input)
  .handler(({ data }) =>
    removeCalendarEvent(serverFetch(), data.uid, data.source),
  )

export const getCalendarSources = createServerFn({ method: 'GET' }).handler(
  () => loadCalendarSources(serverFetch()),
)
