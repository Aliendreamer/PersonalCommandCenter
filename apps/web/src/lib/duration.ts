/** Formats a duration in seconds as `Hh MMm` (e.g. 65040 → "18h 04m"). Zero → "0h 00m". */
export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  return `${hours}h ${String(minutes).padStart(2, '0')}m`
}
