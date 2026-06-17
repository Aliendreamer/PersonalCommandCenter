import type { IotEntity } from '@pcc/contracts'

export interface IotSummaryTileProps {
  /** Provided by the route loader (SSR-with-data); absent when the source is degraded. */
  entities?: IotEntity[]
  error?: boolean
}

/** Dashboard tile summarizing device counts, with a degraded state when unavailable. */
export function IotSummaryTile({ entities, error }: IotSummaryTileProps) {
  if (error || !entities) {
    return (
      <p role="status" className="text-sm text-warning">
        Devices unavailable
      </p>
    )
  }

  const total = entities.length
  const on = entities.filter((entity) => entity.state === 'on').length
  return (
    <p className="text-sm">
      {total} devices · {on} on
    </p>
  )
}
