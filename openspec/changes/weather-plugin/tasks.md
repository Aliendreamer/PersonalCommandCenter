## 1. Backend — Open-Meteo client + `weather` plugin (TDD)

- [ ] 1.1 (TDD) Create `plugins/weather/weather.api`; `IWeatherClient` + a `Weather` model
      (`current { TemperatureC, Code, Condition }`, `daily[] { Date, Code, Condition, HighC, LowC }`)
      + a WMO-code → condition lookup. Implement `OpenMeteoClient : IWeatherClient` over a named
      `HttpClient` (`WeatherOptions{Latitude,Longitude,ForecastDays}`). Unit-test the WMO mapping +
      response mapping with a stub `HttpMessageHandler` (request has lat/lon + current/daily +
      timezone=auto; maps a sample payload).
- [ ] 1.2 Implement `WeatherPlugin : IPlugin` (id `weather`; nav "Weather", `routeBase` `/weather`,
      widget `weather-today`; `Configure` registers `IWeatherClient` + the named `HttpClient` +
      `WeatherOptions`). FastEndpoints `GET /api/weather`: client failure/unconfigured → `502`;
      require auth. Register in `CoreApi.csproj`, `Program.cs`, `PersonalCommandCenter.slnx`,
      Dockerfile; add `Plugins:Weather` config (appsettings + compose env).
- [ ] 1.3 (TDD) `CoreApi.Tests` integration tests (fake `IWeatherClient`): returns current + daily;
      `502` on failure; requires auth; disabled plugin absent from `/api/plugins`.

## 2. Contracts — shared type + client (TDD)

- [ ] 2.1 (TDD) `@pcc/contracts`: `Weather` type (+ nested current/daily) + `getWeather()` client
      method; client tests against a mock fetch.

## 3. Web — read path (SSR-with-data)

- [ ] 3.1 (TDD) `lib/server`: `loadWeather` + `getWeather` server fn; loader unit test (URL).
- [ ] 3.2 `weather-today` tile — presentational (`{ weather?, error? }`): current temp + condition +
      today's high/low, degraded on error; component test.
- [ ] 3.3 `_authenticated/weather` route: loader (`settle(getWeather())`) renders current + the daily
      forecast **server-side**; dashboard renders the `weather-today` tile. `generate-routes`.

## 4. Verify + done gate

- [ ] 4.1 FE gates green: `generate-routes`; `nx run-many -t typecheck lint test build`
      (web + `@pcc/contracts`) + `prettier --check`.
- [ ] 4.2 .NET gates green: `dotnet build` + `dotnet test` + `dotnet format --verify-no-changes`.
- [ ] 4.3 E2E (Playwright, live stack): login; `/weather` server-rendered with conditions; the
      `weather-today` tile shows the current temp; browser only hit `app.`; `api.` stays `404`.
- [ ] 4.4 Update `CLAUDE.md` (the `weather` plugin + Open-Meteo + `Plugins:Weather`); mark complete;
      ready for `/opsx:archive`.
