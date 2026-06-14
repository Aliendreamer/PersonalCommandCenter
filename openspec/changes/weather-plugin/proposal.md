## Why

A "today's weather" tile rounds out the dashboard's daily view next to `calendar`/`tasks`. It's the
smallest possible lift: **Open-Meteo** is free, needs **no API key**, and **no new container** (an
outbound HTTPS call), so it's a clean read-only plugin in the `iot`/`search` mold.

## What Changes

- New **`weather` plugin** (`plugins/weather/weather.api`, id `weather`; manifest nav "Weather",
  `routeBase` `/weather`, widget `weather-today`). FastEndpoints `GET /api/weather`: query Open-Meteo
  for a configured location and return the current conditions + a short daily forecast. An
  `IWeatherClient` + `OpenMeteoClient` (named `HttpClient`); SearXNG/HA-style degrade to `502`.
  Registered in the three compile-time places + Dockerfile; endpoints require auth; lazy
  `Resolve<T>()`.
- Config `Plugins:Weather:{Enabled,Latitude,Longitude,ForecastDays}` — a single configured "home"
  location (no geocoding in v1).
- `@pcc/contracts`: a `Weather` type (`{ current, daily[] }`) + a `getWeather()` client method.
- **Web (SSR-BFF, read-only)**: `lib/server` `loadWeather` + `getWeather` server fn; a `/weather`
  route (SSR loader) showing current conditions + the daily forecast; a `weather-today` dashboard
  tile (current temp + condition + today's high/low). No write path.

## Capabilities

### New Capabilities

- `weather`: read-only current + forecast weather for a configured location via Open-Meteo — the
  `api/weather` endpoint, the Open-Meteo client + WMO-code mapping, config-driven activation,
  graceful degradation, and the "Weather" nav/page/`weather-today` tile.

### Modified Capabilities

<!-- None. `web-shell` and `plugin-host` cover plugin nav/tiles/SSR loaders generically. -->

## Impact

- **Infra**: no new container — core-api gains `Plugins:Weather:*` config + a named Open-Meteo
  `HttpClient` (outbound to `api.open-meteo.com`).
- **Backend**: new `plugins/weather/weather.api` project + 3 registration points + Dockerfile copy.
- **Contracts/Web**: `@pcc/contracts` gains `Weather`; new `_authenticated/weather` route, a tile,
  and a server function.
- **Tests**: Open-Meteo client/mapping unit tests, `api/weather` integration tests, contracts client
  tests, web loader/tile tests, and a live E2E.

## Non-Goals (v1)

Location search/geocoding, multiple locations, units toggle (°C only in v1), hourly forecast,
severe-weather alerts, and historical data.
