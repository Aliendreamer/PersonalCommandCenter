import type { Weather } from '@pcc/contracts'

export interface WeatherTodayTileProps {
  weather?: Weather
  error?: boolean
}

/** Dashboard tile: current temperature + condition (and today's high/low), degraded on error. */
export function WeatherTodayTile({ weather, error }: WeatherTodayTileProps) {
  if (error || !weather) {
    return (
      <p role="status" className="text-sm text-warning">
        Weather unavailable
      </p>
    )
  }

  const today = weather.daily.length > 0 ? weather.daily[0] : null
  return (
    <p className="text-sm">
      {Math.round(weather.current.temperatureC)}°C · {weather.current.condition}
      {today ? ` · ${Math.round(today.highC)}°/${Math.round(today.lowC)}°` : ''}
    </p>
  )
}
