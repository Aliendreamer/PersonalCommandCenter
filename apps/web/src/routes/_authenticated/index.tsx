import { createFileRoute, useNavigate } from '@tanstack/react-router'

import {
  getCalendarEvents,
  getIotEntities,
  getNotifications,
  getPlugins,
  getSystemStatus,
  getTasks,
  getRss,
  getWeather,
} from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { PluginShell } from '../../components/plugin-shell'
import { SystemTile } from '../../components/system-tile'
import { IotSummaryTile } from '../../components/iot-summary-tile'
import { CalendarTodayTile } from '../../components/calendar-today-tile'
import { TasksOpenTile } from '../../components/tasks-open-tile'
import { NotificationsUnreadTile } from '../../components/notifications-unread-tile'
import { SearchBoxTile } from '../../components/search-box-tile'
import { WeatherTodayTile } from '../../components/weather-today-tile'
import { RssLatestTile } from '../../components/rss-latest-tile'

export const Route = createFileRoute('/_authenticated/')({
  // SSR-with-data: the dashboard renders fully populated. Each source is settled independently so
  // one plugin's outage (e.g. IoT 502 without an HA token) degrades only its tile.
  loader: async () => {
    const [plugins, system, iot, calendar, tasks, notifications, weather, rss] =
      await Promise.all([
        settle(getPlugins()),
        settle(getSystemStatus()),
        settle(getIotEntities()),
        settle(getCalendarEvents()),
        settle(getTasks()),
        settle(getNotifications()),
        settle(getWeather()),
        settle(getRss()),
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
    }
  },
  component: Home,
})

function Home() {
  const { plugins, system, iot, calendar, tasks, notifications, weather, rss } =
    Route.useLoaderData()
  const navigate = useNavigate()
  return (
    <PluginShell
      manifests={plugins.data ?? []}
      error={plugins.error ? 'plugins unavailable' : undefined}
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
        return null
      }}
    />
  )
}
