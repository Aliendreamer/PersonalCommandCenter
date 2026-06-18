import { Text } from '@mantine/core'
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
      <Text role="status" size="sm" c="yellow.7">
        Devices unavailable
      </Text>
    )
  }

  const total = entities.length
  const on = entities.filter((entity) => entity.state === 'on').length
  return (
    <Text size="sm">
      {total} devices · {on} on
    </Text>
  )
}
