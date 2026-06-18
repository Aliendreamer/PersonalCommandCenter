import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Box, Button, Group, Title } from '@mantine/core'
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
    <Box p="lg">
      <Group justify="space-between" mb="md">
        <Title order={1}>Notifications</Title>
        {data && data.unread > 0 && (
          <Button size="sm" onClick={onMarkAll}>
            Mark all read
          </Button>
        )}
      </Group>

      <NotificationList
        notifications={data?.notifications ?? []}
        error={result.error ? 'unreachable' : undefined}
        onMarkRead={onMarkRead}
      />
    </Box>
  )
}
