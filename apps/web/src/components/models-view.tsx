import type { ModelsStatus } from '@pcc/contracts'

export interface ModelsViewProps {
  status: ModelsStatus | null
  error?: string
}

function gb(bytes: number): string {
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

/** The /models page body: GPU panel + loaded + installed models. Degrades on error. */
export function ModelsView({ status, error }: ModelsViewProps) {
  if (error || !status) {
    return (
      <p role="status" className="text-sm text-warning">
        Models unavailable
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-lg font-medium">GPU</h2>
        {status.gpus.length === 0 ? (
          <p className="text-sm text-muted-foreground">No GPU telemetry</p>
        ) : (
          <ul className="space-y-1">
            {status.gpus.map((g) => (
              <li key={g.name} className="text-sm">
                <span className="font-medium">{g.name}</span> —{' '}
                {Math.round(g.utilizationPct)}% util ·{' '}
                {Math.round(g.temperatureC)}°C · {Math.round(g.memoryUsedMb)}/
                {Math.round(g.memoryTotalMb)} MB
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium">
          Loaded ({status.running.length})
        </h2>
        {status.running.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing loaded</p>
        ) : (
          <ul className="divide-y rounded border">
            {status.running.map((m) => (
              <li
                key={m.name}
                className="flex justify-between px-3 py-2 text-sm"
              >
                <span>{m.name}</span>
                <span className="text-muted-foreground">
                  {gb(m.sizeVramBytes)} VRAM
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium">
          Installed ({status.installed.length})
        </h2>
        {status.installed.length === 0 ? (
          <p className="text-sm text-muted-foreground">No models pulled</p>
        ) : (
          <ul className="divide-y rounded border">
            {status.installed.map((m) => (
              <li
                key={m.name}
                className="flex justify-between px-3 py-2 text-sm"
              >
                <span>
                  {m.name}
                  {m.parameterSize ? (
                    <span className="text-muted-foreground">
                      {' '}
                      · {m.parameterSize}
                    </span>
                  ) : null}
                  {m.quantization ? (
                    <span className="text-muted-foreground">
                      {' '}
                      · {m.quantization}
                    </span>
                  ) : null}
                </span>
                <span className="text-muted-foreground">{gb(m.sizeBytes)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
