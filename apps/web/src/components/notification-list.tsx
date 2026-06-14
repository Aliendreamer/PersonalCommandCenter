import type { Notification } from '@pcc/contracts'

export interface NotificationListProps {
  notifications: Notification[]
  error?: string
  onMarkRead?: (notification: Notification) => void
}

const severityClass: Record<Notification['severity'], string> = {
  Info: 'text-sky-700',
  Warning: 'text-amber-700',
  Error: 'text-red-700',
}

function when(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Lists notifications newest-first; unread rows are emphasized and offer a mark-read action. */
export function NotificationList({
  notifications,
  error,
  onMarkRead,
}: NotificationListProps) {
  if (error) {
    return (
      <p role="status" className="text-sm text-amber-700">
        Notifications unavailable
      </p>
    )
  }

  if (notifications.length === 0) {
    return <p className="text-sm text-gray-500">No notifications</p>
  }

  return (
    <ul className="divide-y rounded border">
      {notifications.map((n) => {
        const unread = n.readAt == null
        return (
          <li
            key={n.id}
            className="flex items-start justify-between gap-3 px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs uppercase ${severityClass[n.severity]}`}
                >
                  {n.severity}
                </span>
                <span className={unread ? 'font-semibold' : 'text-gray-500'}>
                  {n.title}
                </span>
              </div>
              {n.message && <p className="text-gray-600">{n.message}</p>}
              <p className="text-xs text-gray-400">
                {n.source} · {when(n.createdAt)}
              </p>
            </div>
            {unread && onMarkRead && (
              <button
                type="button"
                onClick={() => onMarkRead(n)}
                className="shrink-0 underline"
              >
                Mark read
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
