import type { UptimeCheck } from '@pcc/contracts'

export interface UptimeStatusTileProps {
  checks?: UptimeCheck[]
  error?: boolean
}

/** Dashboard tile: how many configured targets are up (N/M), degraded on error. */
export function UptimeStatusTile({ checks, error }: UptimeStatusTileProps) {
  if (error || !checks) {
    return (
      <p role="status" className="text-sm text-amber-700">
        Uptime unavailable
      </p>
    )
  }

  if (checks.length === 0) {
    return <p className="text-sm text-gray-500">No targets</p>
  }

  const up = checks.filter((c) => c.up).length
  const allUp = up === checks.length
  return (
    <div className="text-sm">
      <p
        className={
          allUp ? 'font-medium text-green-700' : 'font-medium text-amber-700'
        }
      >
        {up}/{checks.length} up
      </p>
    </div>
  )
}
