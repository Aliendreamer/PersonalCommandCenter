import { createFileRoute } from '@tanstack/react-router'

import {
  getCalendarEvents,
  getIotEntities,
  getNotifications,
  getPlugins,
  getSystemStatus,
  getTasks,
} from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { PluginShell } from '../../components/plugin-shell'
import { SystemTile } from '../../components/system-tile'
import { IotSummaryTile } from '../../components/iot-summary-tile'
import { CalendarTodayTile } from '../../components/calendar-today-tile'
import { TasksOpenTile } from '../../components/tasks-open-tile'
import { NotificationsUnreadTile } from '../../components/notifications-unread-tile'

export const Route = createFileRoute('/_authenticated/')({
  // SSR-with-data: the dashboard renders fully populated. Each source is settled independently so
  // one plugin's outage (e.g. IoT 502 without an HA token) degrades only its tile.
  loader: async () => {
    const [plugins, system, iot, calendar, tasks, notifications] =
      await Promise.all([
        settle(getPlugins()),
        settle(getSystemStatus()),
        settle(getIotEntities()),
        settle(getCalendarEvents()),
        settle(getTasks()),
        settle(getNotifications()),
      ])
    return { plugins, system, iot, calendar, tasks, notifications }
  },
  component: Home,
})

function Home() {
  const { plugins, system, iot, calendar, tasks, notifications } =
    Route.useLoaderData()
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
        return null
      }}
    />
  )
}
