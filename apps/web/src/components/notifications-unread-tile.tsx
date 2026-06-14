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
      <p role="status" className="text-sm text-amber-700">
        Notifications unavailable
      </p>
    )
  }

  if (unread === 0) {
    return <p className="text-sm text-gray-500">All caught up</p>
  }

  return <p className="text-sm">{unread} unread</p>
}
