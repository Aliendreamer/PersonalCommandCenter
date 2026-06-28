import { Text } from '@mantine/core'
import type { MailHeader } from '@pcc/contracts'

export interface MailUnreadTileProps {
  messages?: MailHeader[]
  error?: boolean
}

/** Dashboard tile showing the unread mail count, degraded on error. */
export function MailUnreadTile({ messages, error }: MailUnreadTileProps) {
  if (error || !messages) {
    return (
      <Text role="status" size="sm" c="yellow.7">
        Mail unavailable
      </Text>
    )
  }

  const unread = messages.filter((m) => !m.isRead).length

  if (unread === 0) {
    return (
      <Text size="sm" c="dimmed">
        No unread mail
      </Text>
    )
  }

  return (
    <div>
      <Text size="sm" fw={500}>
        {unread} unread {unread === 1 ? 'message' : 'messages'}
      </Text>
    </div>
  )
}
