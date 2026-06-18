import { Anchor, Box, Group, Paper, Text } from '@mantine/core'
import type { Notification } from '@pcc/contracts'

export interface NotificationListProps {
  notifications: Notification[]
  error?: string
  onMarkRead?: (notification: Notification) => void
}

const severityColor: Record<Notification['severity'], string> = {
  Info: 'sky',
  Warning: 'yellow.7',
  Error: 'red',
}

function when(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const rowBorder = (i: number) =>
  i > 0
    ? { borderTop: '1px solid var(--mantine-color-default-border)' }
    : undefined

/** Lists notifications newest-first; unread rows are emphasized and offer a mark-read action. */
export function NotificationList({
  notifications,
  error,
  onMarkRead,
}: NotificationListProps) {
  if (error) {
    return (
      <Text role="status" size="sm" c="yellow.7">
        Notifications unavailable
      </Text>
    )
  }

  if (notifications.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No notifications
      </Text>
    )
  }

  return (
    <Paper withBorder radius="md">
      <Box component="ul" m={0} p={0} style={{ listStyle: 'none' }}>
        {notifications.map((n, i) => {
          const unread = n.readAt == null
          return (
            <Box component="li" key={n.id} style={rowBorder(i)}>
              <Group
                justify="space-between"
                align="flex-start"
                wrap="nowrap"
                px="sm"
                py="xs"
              >
                <div style={{ minWidth: 0 }}>
                  <Group gap="xs" wrap="nowrap">
                    <Text
                      span
                      size="xs"
                      tt="uppercase"
                      c={severityColor[n.severity]}
                    >
                      {n.severity}
                    </Text>
                    <Text
                      span
                      size="sm"
                      fw={unread ? 600 : undefined}
                      c={unread ? undefined : 'dimmed'}
                    >
                      {n.title}
                    </Text>
                  </Group>
                  {n.message && (
                    <Text size="sm" c="dimmed">
                      {n.message}
                    </Text>
                  )}
                  <Text size="xs" c="dimmed">
                    {n.source} · {when(n.createdAt)}
                  </Text>
                </div>
                {unread && onMarkRead && (
                  <Anchor
                    component="button"
                    type="button"
                    size="sm"
                    style={{ flex: 'none' }}
                    onClick={() => onMarkRead(n)}
                  >
                    Mark read
                  </Anchor>
                )}
              </Group>
            </Box>
          )
        })}
      </Box>
    </Paper>
  )
}
