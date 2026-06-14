import { createFileRoute, useRouter } from '@tanstack/react-router'
import type { Notification } from '@pcc/contracts'

import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { NotificationList } from '../../components/notification-list'

export const Route = createFileRoute('/_authenticated/notifications')({
  loader: async () => settle(getNotifications()),
  component: NotificationsPage,
})

function NotificationsPage() {
  const result = Route.useLoaderData()
  const router = useRouter()
  const data = result.data

  async function onMarkRead(notification: Notification) {
    await markNotificationRead({ data: notification.id })
    await router.invalidate()
  }

  async function onMarkAll() {
    await markAllNotificationsRead()
    await router.invalidate()
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        {data && data.unread > 0 && (
          <button
            type="button"
            onClick={onMarkAll}
            className="rounded bg-gray-900 px-3 py-1 text-sm text-white"
          >
            Mark all read
          </button>
        )}
      </div>

      <NotificationList
        notifications={data?.notifications ?? []}
        error={result.error ? 'unreachable' : undefined}
        onMarkRead={onMarkRead}
      />
    </div>
  )
}
