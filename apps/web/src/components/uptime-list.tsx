import type { UptimeCheck } from '@pcc/contracts'

export interface UptimeListProps {
  checks: UptimeCheck[]
  error?: string
}

/** Lists each target with an up/down badge + latency. Degrades on error. */
export function UptimeList({ checks, error }: UptimeListProps) {
  if (error) {
    return (
      <p role="status" className="text-sm text-amber-700">
        Uptime unavailable
      </p>
    )
  }

  if (checks.length === 0) {
    return <p className="text-sm text-gray-500">No targets</p>
  }

  return (
    <ul className="divide-y rounded border">
      {checks.map((check) => (
        <li
          key={check.url}
          className="flex items-center justify-between px-3 py-2 text-sm"
        >
          <div className="min-w-0">
            <p className="truncate font-medium">{check.name}</p>
            <p className="truncate text-xs text-gray-400">{check.url}</p>
          </div>
          <div className="flex flex-none items-center gap-2">
            <span className="text-xs text-gray-400">{check.latencyMs} ms</span>
            <span
              className={
                check.up
                  ? 'rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700'
                  : 'rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700'
              }
            >
              {check.up ? 'up' : 'down'}
              {check.statusCode != null ? ` · ${check.statusCode}` : ''}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}
