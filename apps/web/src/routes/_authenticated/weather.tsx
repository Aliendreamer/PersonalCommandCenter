import { createFileRoute } from '@tanstack/react-router'

import { getWeather } from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'

export const Route = createFileRoute('/_authenticated/weather')({
  loader: async () => settle(getWeather()),
  component: WeatherPage,
})

function WeatherPage() {
  const result = Route.useLoaderData()
  const weather = result.data

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-semibold">Weather</h1>
      {result.error || !weather ? (
        <p role="status" className="text-sm text-amber-700">
          Weather unavailable
        </p>
      ) : (
        <>
          <p className="mb-6 text-3xl font-semibold">
            {Math.round(weather.current.temperatureC)}°C{' '}
            <span className="text-base font-normal text-gray-500">
              {weather.current.condition}
            </span>
          </p>
          <ul className="divide-y rounded border">
            {weather.daily.map((day) => (
              <li
                key={day.date}
                className="flex items-center justify-between px-3 py-2 text-sm"
              >
                <span>
                  {new Date(day.date).toLocaleDateString([], {
                    weekday: 'short',
                  })}
                </span>
                <span className="text-gray-500">{day.condition}</span>
                <span>
                  {Math.round(day.highC)}° / {Math.round(day.lowC)}°
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
