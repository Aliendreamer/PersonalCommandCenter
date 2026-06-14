import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { Weather } from '@pcc/contracts'
import { WeatherTodayTile } from './weather-today-tile'

const weather: Weather = {
  current: { temperatureC: 12.3, code: 3, condition: 'Overcast' },
  daily: [
    { date: '2026-06-15', code: 3, condition: 'Overcast', highC: 18, lowC: 9 },
  ],
}

afterEach(cleanup)

describe('WeatherTodayTile', () => {
  it('shows current temp + condition', () => {
    render(<WeatherTodayTile weather={weather} />)
    expect(screen.getByText(/12°C · Overcast/)).toBeDefined()
  })

  it('shows a degraded state on error', () => {
    render(<WeatherTodayTile error />)
    expect(screen.getByText(/unavailable/i)).toBeDefined()
  })
})
