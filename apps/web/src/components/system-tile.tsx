import { useEffect, useState } from 'react'
import type { SystemStatus } from '@pcc/contracts'
import { api } from '../lib/api'

type TileState =
  | { kind: 'loading' }
  | { kind: 'ready'; status: SystemStatus }
  | { kind: 'error' }

export interface SystemTileProps {
  /** Injectable for tests; defaults to the real core-api client. */
  fetchStatus?: () => Promise<SystemStatus>
}

/** Dashboard tile showing live system status, with a degraded state on error. */
export function SystemTile({
  fetchStatus = api.getSystemStatus,
}: SystemTileProps) {
  const [state, setState] = useState<TileState>({ kind: 'loading' })

  useEffect(() => {
    let active = true
    fetchStatus().then(
      (status) => {
        if (active) setState({ kind: 'ready', status })
      },
      () => {
        if (active) setState({ kind: 'error' })
      },
    )
    return () => {
      active = false
    }
  }, [fetchStatus])

  if (state.kind === 'loading') {
    return <p className="text-sm text-gray-500">Loading…</p>
  }

  if (state.kind === 'error') {
    return (
      <p role="status" className="text-sm text-amber-700">
        Status unavailable
      </p>
    )
  }

  const { status } = state
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
