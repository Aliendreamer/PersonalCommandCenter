import type { Settled } from './server/api-loaders'

/** A tile's data-source health, shown as a colored accent + status dot on the board. */
export type Health = 'ok' | 'degraded' | 'down'

/**
 * Derives a tile's health from its settled load result. A source error is `down`; a loaded-but-
 * partial result (per the optional predicate) is `degraded`; anything else is `ok`. A valid result
 * with no activity (e.g. a zero-activity coding week) is `ok` — make the predicate return false for it.
 */
export function deriveHealth<T>(
  settled: Settled<T>,
  isDegraded?: (data: T) => boolean,
): Health {
  if (settled.error) {
    return 'down'
  }
  if (isDegraded && isDegraded(settled.data)) {
    return 'degraded'
  }
  return 'ok'
}

/** Maps a health to its Mantine theme color (sky stays the app primary). */
export function healthColor(health: Health): 'green' | 'yellow' | 'red' {
  return health === 'ok' ? 'green' : health === 'degraded' ? 'yellow' : 'red'
}

/** Aggregates per-tile healths for the hero readout (count of green over total). */
export function healthCount(healths: Health[]): { ok: number; total: number } {
  return {
    ok: healths.filter((h) => h === 'ok').length,
    total: healths.length,
  }
}
