import { Text } from '@mantine/core'
import type { ModelsStatus } from '@pcc/contracts'

export interface ModelsStatusTileProps {
  status?: ModelsStatus
  error?: boolean
}

/** Dashboard tile: installed/loaded counts + a GPU summary, degraded on error. */
export function ModelsStatusTile({ status, error }: ModelsStatusTileProps) {
  if (error || !status) {
    return (
      <Text role="status" size="sm" c="yellow.7">
        Models unavailable
      </Text>
    )
  }

  const gpu = status.gpus.length > 0 ? status.gpus[0] : null
  return (
    <div>
      <Text size="sm" fw={500}>
        {status.installed.length} models · {status.running.length} loaded
      </Text>
      <Text size="xs" c="dimmed">
        {gpu
          ? `GPU ${Math.round(gpu.utilizationPct)}% · ${Math.round(gpu.temperatureC)}°C`
          : 'no GPU data'}
      </Text>
    </div>
  )
}
