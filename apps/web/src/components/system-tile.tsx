import type { SystemStatus } from '@pcc/contracts'

export interface SystemTileProps {
  /** Provided by the route loader (SSR-with-data); absent when the source is degraded. */
  status?: SystemStatus
  error?: boolean
}

/** Dashboard tile showing system status, with a degraded state when unavailable. */
export function SystemTile({ status, error }: SystemTileProps) {
  if (error || !status) {
    return (
      <p role="status" className="text-sm text-amber-700">
        Status unavailable
      </p>
    )
  }

  return (
    <dl className="text-sm">
      <div className="flex justify-between">
        <dt>Healthy</dt>
        <dd>{status.apiHealthy ? 'yes' : 'no'}</dd>
      </div>
      <div className="flex justify-between">
        <dt>Host</dt>
        <dd>{status.hostname}</dd>
      </div>
      <div className="flex justify-between">
        <dt>Version</dt>
        <dd>{status.version}</dd>
      </div>
    </dl>
  )
}
