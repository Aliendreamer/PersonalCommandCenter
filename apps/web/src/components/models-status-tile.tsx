import type { ModelsStatus } from '@pcc/contracts'

export interface ModelsStatusTileProps {
  status?: ModelsStatus
  error?: boolean
}

/** Dashboard tile: installed/loaded counts + a GPU summary, degraded on error. */
export function ModelsStatusTile({ status, error }: ModelsStatusTileProps) {
  if (error || !status) {
    return (
      <p role="status" className="text-sm text-warning">
        Models unavailable
      </p>
    )
  }

  const gpu = status.gpus.length > 0 ? status.gpus[0] : null
  return (
    <div className="text-sm">
      <p className="font-medium">
        {status.installed.length} models · {status.running.length} loaded
      </p>
      <p className="text-xs text-muted-foreground">
        {gpu
          ? `GPU ${Math.round(gpu.utilizationPct)}% · ${Math.round(gpu.temperatureC)}°C`
          : 'no GPU data'}
      </p>
    </div>
  )
}
