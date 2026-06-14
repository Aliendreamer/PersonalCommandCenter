## 1. Backend — uptime client + `uptime` plugin (TDD)

- [x] 1.1 (TDD) Create `plugins/uptime/uptime.api`; `IUptimeClient` + an `UptimeCheck` model
      (`Name, Url, Up, StatusCode?, LatencyMs`). Implement `HttpUptimeClient : IUptimeClient` over a
      named `HttpClient` (`UptimeOptions{Targets[{Name,Url}],TimeoutSeconds}`): ping each target
      concurrently with a timeout, `Up` = status `< 400`, exceptions/timeouts → `Up:false`, capture
      latency. Unit-test with a stub `HttpMessageHandler` (a 200 target → up; a throwing target → down).
- [x] 1.2 Implement `UptimePlugin : IPlugin` (id `uptime`; nav "Uptime", `routeBase` `/uptime`,
      widget `uptime-status`; `Configure` registers the client + named `HttpClient` + options).
      FastEndpoints `GET /api/uptime`: no targets configured → `502`; per-target down is `200` data;
      require auth. Register in `CoreApi.csproj`, `Program.cs`, `PersonalCommandCenter.slnx`,
      Dockerfile; `Plugins:Uptime` config (appsettings + compose env, e.g. ping core-api `/health`).
- [x] 1.3 (TDD) `CoreApi.Tests` integration tests (fake `IUptimeClient`): returns up + down targets
      (`200`); `502` when no targets; requires auth; disabled plugin absent from `/api/plugins`.

## 2. Contracts — shared type + client (TDD)

- [x] 2.1 (TDD) `@pcc/contracts`: `UptimeCheck` type + `getUptime()` client method; client tests
      (mock fetch).

## 3. Web — read path (SSR-with-data)

- [x] 3.1 (TDD) `lib/server`: `loadUptime` + `getUptime` server fn; loader unit test (URL).
- [x] 3.2 `uptime-status` tile — presentational (`{ checks?, error? }`): "N/M up", degraded on error;
      component test. An `UptimeList` presentational component (per-target up/down badge + latency)
      + test.
- [x] 3.3 `_authenticated/uptime` route: loader (`settle(getUptime())`) renders each target's status
      **server-side**; dashboard renders the `uptime-status` tile. `generate-routes`.

## 4. Verify + done gate

- [x] 4.1 FE gates green: `generate-routes`; `nx run-many -t typecheck lint test build` + prettier.
- [x] 4.2 .NET gates green: `dotnet build` + `dotnet test` + `dotnet format --verify-no-changes`.
- [x] 4.3 E2E (Playwright, live stack; configure a known-up target e.g. core-api `/health`): login;
      `/uptime` server-rendered with statuses; the tile shows the up count; browser only hit `app.`;
      `api.` stays `404`.
- [x] 4.4 Update `CLAUDE.md` (the `uptime` plugin + `Plugins:Uptime` + the HTTP-checks/Docker-deferred
      note); mark complete; ready for `/opsx:archive`.
