import { Button } from '@mantine/core'

export interface RssRefreshButtonProps {
  onRefresh: () => void
  loading: boolean
}

/** Header action: force a live re-pull of all feeds (bypasses the cache). */
export function RssRefreshButton({
  onRefresh,
  loading,
}: RssRefreshButtonProps) {
  return (
    <Button variant="default" size="xs" onClick={onRefresh} loading={loading}>
      Refresh
    </Button>
  )
}
