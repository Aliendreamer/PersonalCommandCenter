import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { PluginManifest } from '@pcc/contracts'

import {
  getCalendarEvents,
  getCoding,
  getIotEntities,
  getNotifications,
  getPlugins,
  getSystemStatus,
  getTasks,
  getGoodreads,
  getRss,
  getWeather,
  getUptime,
  getModels,
} from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import type { Settled } from '../../lib/server/api-loaders'
import { deriveHealth } from '../../lib/health'
import { PluginShell } from '../../components/plugin-shell'
import { DashboardHero } from '../../components/dashboard-hero'
import { SystemTile } from '../../components/system-tile'
import { IotSummaryTile } from '../../components/iot-summary-tile'
import { CalendarTodayTile } from '../../components/calendar-today-tile'
import { TasksOpenTile } from '../../components/tasks-open-tile'
import { NotificationsUnreadTile } from '../../components/notifications-unread-tile'
import { SearchBoxTile } from '../../components/search-box-tile'
import { WeatherTodayTile } from '../../components/weather-today-tile'
import { RssLatestTile } from '../../components/rss-latest-tile'
import { GoodreadsReadingTile } from '../../components/goodreads-reading-tile'
import { UptimeStatusTile } from '../../components/uptime-status-tile'
import { ModelsStatusTile } from '../../components/models-status-tile'
import { CodingStatusTile } from '../../components/coding-status-tile'

export const Route = createFileRoute('/_authenticated/')({
  // SSR-with-data: the dashboard renders fully populated. Each source is settled independently so
  // one plugin's outage (e.g. IoT 502 without an HA token) degrades only its tile.
  loader: async () => {
    const [
      plugins,
      system,
      iot,
      calendar,
      tasks,
      notifications,
      weather,
      rss,
      goodreads,
      uptime,
      models,
      coding,
    ] = await Promise.all([
      settle(getPlugins()),
      settle(getSystemStatus()),
      settle(getIotEntities()),
      settle(getCalendarEvents()),
      settle(getTasks()),
      settle(getNotifications()),
      settle(getWeather()),
      settle(getRss()),
      settle(getGoodreads()),
      settle(getUptime()),
      settle(getModels()),
      settle(getCoding()),
    ])
    return {
      plugins,
      system,
      iot,
      calendar,
      tasks,
      notifications,
      weather,
      rss,
      goodreads,
      uptime,
      models,
      coding,
    }
  },
  component: Home,
})

function Home() {
  const {
    plugins,
    system,
    iot,
    calendar,
    tasks,
    notifications,
    weather,
    rss,
    goodreads,
    uptime,
    models,
    coding,
  } = Route.useLoaderData()
  const navigate = useNavigate()

  // Map each manifest to its settled load result, so the hero count and per-tile status dot are
  // derived from a single source. The search tile has no data source — it is always healthy.
  const okSource: Settled<true> = { data: true }
  const settledFor = (manifest: PluginManifest): Settled<unknown> => {
    if (manifest.widgets.includes('system-status')) return system
    if (manifest.widgets.includes('iot-summary')) return iot
    if (manifest.widgets.includes('calendar-today')) return calendar
    if (manifest.widgets.includes('tasks-open')) return tasks
    if (manifest.widgets.includes('notifications-unread')) return notifications
    if (manifest.widgets.includes('weather-today')) return weather
    if (manifest.widgets.includes('rss-latest')) return rss
    if (manifest.widgets.includes('goodreads-reading')) return goodreads
    if (manifest.widgets.includes('uptime-status')) return uptime
    if (manifest.widgets.includes('models-status')) return models
    if (manifest.widgets.includes('coding-status')) return coding
    return okSource
  }

  const manifests = plugins.data ?? []
  const tileHealth = (manifest: PluginManifest) =>
    deriveHealth(settledFor(manifest))
  const healths = manifests.map(tileHealth)

  return (
    <PluginShell
      manifests={manifests}
      error={plugins.error ? 'plugins unavailable' : undefined}
      hero={<DashboardHero healths={healths} />}
      tileHealth={tileHealth}
      renderTile={(manifest) => {
        if (manifest.widgets.includes('system-status')) {
          return <SystemTile status={system.data} error={system.error} />
        }
        if (manifest.widgets.includes('iot-summary')) {
          return <IotSummaryTile entities={iot.data} error={iot.error} />
        }
        if (manifest.widgets.includes('calendar-today')) {
          return (
            <CalendarTodayTile events={calendar.data} error={calendar.error} />
          )
        }
        if (manifest.widgets.includes('tasks-open')) {
          return <TasksOpenTile tasks={tasks.data} error={tasks.error} />
        }
        if (manifest.widgets.includes('notifications-unread')) {
          return (
            <NotificationsUnreadTile
              unread={notifications.data?.unread}
              error={notifications.error}
            />
          )
        }
        if (manifest.widgets.includes('search-box')) {
          return (
            <SearchBoxTile
              onSearch={(q) => navigate({ to: '/search', search: { q } })}
            />
          )
        }
        if (manifest.widgets.includes('weather-today')) {
          return (
            <WeatherTodayTile weather={weather.data} error={weather.error} />
          )
        }
        if (manifest.widgets.includes('rss-latest')) {
          return <RssLatestTile items={rss.data} error={rss.error} />
        }
        if (manifest.widgets.includes('goodreads-reading')) {
          return (
            <GoodreadsReadingTile
              books={goodreads.data}
              error={goodreads.error}
            />
          )
        }
        if (manifest.widgets.includes('uptime-status')) {
          return <UptimeStatusTile checks={uptime.data} error={uptime.error} />
        }
        if (manifest.widgets.includes('models-status')) {
          return <ModelsStatusTile status={models.data} error={models.error} />
        }
        if (manifest.widgets.includes('coding-status')) {
          return <CodingStatusTile status={coding.data} error={coding.error} />
        }
        return null
      }}
    />
  )
}
