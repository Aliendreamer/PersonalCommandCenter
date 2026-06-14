## Context

A read-only plugin structurally identical to `iot`/`search`: query an external HTTP API, map the
response, degrade to `502`, render a tile + page through the SSR-BFF. The only twist is mapping WMO
weather codes to human conditions. No new container, no key.

## Goals / Non-Goals

**Goals:** a `weather` plugin matching the read-only pattern; current + short daily forecast for a
configured location; a `weather-today` tile + `/weather` page.

**Non-Goals:** geocoding/location search, multiple locations, units toggle (°C only), hourly
forecast, alerts, history.

## Decisions

- **Open-Meteo** (`https://api.open-meteo.com/v1/forecast`) — free, no key, generous limits. Query:
  `?latitude=…&longitude=…&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,
  temperature_2m_min&timezone=auto&forecast_days={ForecastDays}`.
- **`OpenMeteoClient : IWeatherClient`** over a named `HttpClient` + `WeatherOptions{Latitude,
  Longitude,ForecastDays=5}`. Deserialize `current` + the parallel `daily` arrays into
  `{ current, daily[] }`. Abstracted for lazy `Resolve<T>()` + test fakes.
- **WMO code → condition mapping** is a small static lookup (clear/mainly-clear/cloudy/fog/drizzle/
  rain/snow/thunderstorm buckets); unknown codes fall back to a generic label. Unit-tested.
- **Validation/degradation = the IoT contract.** Unconfigured (no lat/lon) or client failure →
  `502`; the tile/page degrade.
- **°C only** in v1 (Open-Meteo defaults to metric). A units toggle is a follow-up.
- **Web mirrors `search`/`iot`**: a `getWeather` loader server fn feeds the `/weather` route and the
  `weather-today` tile (presentational, data via props).

## Risks / Trade-offs

- **Outbound internet dependency** (api.open-meteo.com) → the live container needs egress; degrades
  to `502` if blocked. The unit/integration tests stub the client, so gates don't need network.
- **WMO mapping completeness** → bucket the common codes, fall back gracefully; unit-test the buckets.
- **Configured single location** → fine for a personal command center; geocoding is the obvious next
  step.
