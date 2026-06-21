import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Button } from '@mantine/core'
import type { Notification } from '@pcc/contracts'

import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { NotificationList } from '../../components/notification-list'
import { PluginPage } from '../../components/plugin-page'

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
    <PluginPage
      title="Notifications"
      fill
      scroll={false}
      actions={
        data &&
        data.unread > 0 && (
          <Button size="sm" onClick={onMarkAll}>
            Mark all read
          </Button>
        )
      }
    >
      <NotificationList
        notifications={data?.notifications ?? []}
        error={result.error ? 'unreachable' : undefined}
        onMarkRead={onMarkRead}
      />
    </PluginPage>
  )
}
