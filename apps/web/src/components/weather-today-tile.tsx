import { Text } from '@mantine/core'
import type { Weather } from '@pcc/contracts'

export interface WeatherTodayTileProps {
  weather?: Weather
  error?: boolean
}

/** Dashboard tile: current temperature + condition (and today's high/low), degraded on error. */
export function WeatherTodayTile({ weather, error }: WeatherTodayTileProps) {
  if (error || !weather) {
    return (
      <Text role="status" size="sm" c="yellow.7">
        Weather unavailable
      </Text>
    )
  }

  const today = weather.daily.length > 0 ? weather.daily[0] : null
  return (
    <Text size="sm">
      {Math.round(weather.current.temperatureC)}°C · {weather.current.condition}
      {today ? ` · ${Math.round(today.highC)}°/${Math.round(today.lowC)}°` : ''}
    </Text>
  )
}
