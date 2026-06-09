import { useEffect, useState } from 'react'
import type { IotEntity } from '@pcc/contracts'
import { api } from '../lib/api'

type TileState =
  | { kind: 'loading' }
  | { kind: 'ready'; entities: IotEntity[] }
  | { kind: 'error' }

export interface IotSummaryTileProps {
  /** Injectable for tests; defaults to the real core-api client. */
  fetchEntities?: () => Promise<IotEntity[]>
}

/** Dashboard tile summarizing device counts, with a degraded state on error. */
export function IotSummaryTile({
  fetchEntities = api.getIotEntities,
}: IotSummaryTileProps) {
  const [state, setState] = useState<TileState>({ kind: 'loading' })

  useEffect(() => {
    let active = true
    fetchEntities().then(
      (entities) => {
        if (active) setState({ kind: 'ready', entities })
      },
      () => {
        if (active) setState({ kind: 'error' })
      },
    )
    return () => {
      active = false
    }
  }, [fetchEntities])

  if (state.kind === 'loading') {
    return <p className="text-sm text-gray-500">Loading…</p>
  }

  if (state.kind === 'error') {
    return (
      <p role="status" className="text-sm text-amber-700">
        Devices unavailable
      </p>
    )
  }

  const total = state.entities.length
  const on = state.entities.filter((entity) => entity.state === 'on').length
  return (
    <p className="text-sm">
      {total} devices · {on} on
    </p>
  )
}
