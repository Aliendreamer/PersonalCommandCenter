import { Text } from '@mantine/core'

export interface NotificationsUnreadTileProps {
  /** Provided by the route loader (SSR-with-data); absent when the source is degraded. */
  unread?: number
  error?: boolean
}

/** Dashboard tile showing the unread notification count, with a degraded state when unavailable. */
export function NotificationsUnreadTile({
  unread,
  error,
}: NotificationsUnreadTileProps) {
  if (error || unread === undefined) {
    return (
      <Text role="status" size="sm" c="yellow.7">
        Notifications unavailable
      </Text>
    )
  }

  if (unread === 0) {
    return (
      <Text size="sm" c="dimmed">
        All caught up
      </Text>
    )
  }

  return <Text size="sm">{unread} unread</Text>
}
