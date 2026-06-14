## ADDED Requirements

### Requirement: Weather query

The `weather` plugin SHALL query Open-Meteo for the configured latitude/longitude and expose
`GET /api/weather` returning the current conditions and a short daily forecast:
`{ current: { temperatureC, code, condition }, daily: [{ date, code, condition, highC, lowC }] }`.
WMO weather codes SHALL be mapped to a human `condition` string.

#### Scenario: Returns current + daily forecast

- **WHEN** a client requests `GET /api/weather` and Open-Meteo returns data
- **THEN** the response includes the current `temperatureC`/`condition` and a `daily` list with each
  day's `highC`/`lowC`/`condition`

#### Scenario: Queries the configured location with the daily fields

- **WHEN** the plugin queries Open-Meteo
- **THEN** the request targets the forecast endpoint with the configured `latitude`/`longitude`, the
  `current` + `daily` fields, and `timezone=auto`

### Requirement: Config-driven activation

The `weather` plugin SHALL activate only when `Plugins:Weather:Enabled` is `true`, and SHALL appear
in `/api/plugins` with a "Weather" nav entry and `weather-today` widget when enabled.

#### Scenario: Disabled plugin is absent

- **WHEN** the core starts with `Plugins:Weather:Enabled = false`
- **THEN** `GET /api/weather` is not served and `weather` is absent from `/api/plugins`

### Requirement: Graceful degradation on Open-Meteo failure

When Open-Meteo is unreachable or not configured, the `weather` plugin SHALL respond with `502`, and
the UI SHALL show a degraded state without breaking the dashboard.

#### Scenario: Open-Meteo unreachable

- **WHEN** the Open-Meteo request fails or no latitude/longitude is configured
- **THEN** `GET /api/weather` responds with `502` and the Weather tile/page show a degraded state

### Requirement: Weather UI surfaces (read-only via the SSR-BFF)

The `weather` plugin SHALL contribute a "Weather" nav entry, a `/weather` page that is
server-rendered with the current conditions + the daily forecast, and a `weather-today` dashboard
tile showing the current temperature, condition, and today's high/low. Reads SHALL go through the
SSR server — the browser SHALL NOT call core-api directly.

#### Scenario: Weather page is server-rendered

- **WHEN** the `/weather` page is requested with data available
- **THEN** the server-rendered HTML already shows the current conditions + the forecast

#### Scenario: Today tile shows current conditions

- **WHEN** the dashboard renders with the `weather` plugin enabled and data available
- **THEN** the `weather-today` tile shows the current temperature + condition (and today's high/low),
  degrading to a "Weather unavailable" state on error
