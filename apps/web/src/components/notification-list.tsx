import { useRef } from 'react'
import { Anchor, Box, Group, Paper, Text } from '@mantine/core'
import { useVirtualizer } from '@tanstack/react-virtual'
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

/** One notification row (pure) — newest-first list; unread rows are emphasized + offer mark-read. */
export function NotificationRow({
  notification: n,
  first,
  onMarkRead,
}: {
  notification: Notification
  first: boolean
  onMarkRead?: (notification: Notification) => void
}) {
  const unread = n.readAt == null
  return (
    <Box
      role="listitem"
      style={
        first
          ? undefined
          : { borderTop: '1px solid var(--mantine-color-default-border)' }
      }
    >
      <Group
        justify="space-between"
        align="flex-start"
        wrap="nowrap"
        px="sm"
        py="xs"
      >
        <div style={{ minWidth: 0 }}>
          <Group gap="xs" wrap="nowrap">
            <Text span size="xs" tt="uppercase" c={severityColor[n.severity]}>
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
}

/**
 * The notifications list, virtualized (only the visible rows render) so it can grow unbounded while
 * fitting the window. It fills its parent's height and owns the scroll. When no scroll height has been
 * measured yet (SSR / first paint / jsdom) it renders every row, so the content is never blank and
 * hydration matches.
 */
export function NotificationList({
  notifications,
  error,
  onMarkRead,
}: NotificationListProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: notifications.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 8,
  })

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

  const virtualItems = virtualizer.getVirtualItems()
  const measured = virtualItems.length > 0

  return (
    <Paper
      withBorder
      radius="md"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div ref={parentRef} style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {measured ? (
          <div
            role="list"
            style={{
              height: virtualizer.getTotalSize(),
              position: 'relative',
            }}
          >
            {virtualItems.map((vi) => (
              <div
                key={notifications[vi.index].id}
                data-index={vi.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${vi.start}px)`,
                }}
              >
                <NotificationRow
                  notification={notifications[vi.index]}
                  first={vi.index === 0}
                  onMarkRead={onMarkRead}
                />
              </div>
            ))}
          </div>
        ) : (
          <div role="list">
            {notifications.map((n, i) => (
              <NotificationRow
                key={n.id}
                notification={n}
                first={i === 0}
                onMarkRead={onMarkRead}
              />
            ))}
          </div>
        )}
      </div>
    </Paper>
  )
}
