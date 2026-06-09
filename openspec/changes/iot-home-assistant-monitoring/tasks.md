## 1. IoT plugin scaffold

- [ ] 1.1 Create `plugins/iot/iot.api` (.NET classlib) referencing PluginAbstractions +
      `Microsoft.AspNetCore.App`; add to the solution; reference it from core-api
- [ ] 1.2 Add `IotPlugin : IPlugin` (id `iot`, manifest: nav "Devices", route `/devices`,
      widget `iot-summary`) with empty `Configure`/`MapEndpoints` stubs

## 2. Home Assistant client (TDD)

- [ ] 2.1 (TDD) Failing unit tests for `HomeAssistantClient` using a stub `HttpMessageHandler`:
      maps `/api/states` JSON to `IotEntity`, filters to configured domains, sends
      `Authorization: Bearer <token>` to `{BaseUrl}/api/states`
- [ ] 2.2 Define `IotEntity` + `IHomeAssistantClient`; implement `HomeAssistantClient` until
      2.1 passes
- [ ] 2.3 Bind `Plugins:Iot` options (BaseUrl, Token, Domains) and register the typed
      `HttpClient` + client in `IotPlugin.Configure`

## 3. Entities endpoint (TDD)

- [ ] 3.1 (TDD) Failing integration test: `GET /api/iot/entities` (enabled, fake HA client)
      returns mapped entities; disabled → `iot` absent from `/api/plugins` and endpoint 404
- [ ] 3.2 (TDD) Failing integration test: HA client failure → `GET /api/iot/entities` returns
      `502`
- [ ] 3.3 Implement `MapEndpoints` (`GET /api/iot/entities`) until 3.1 and 3.2 pass

## 4. Contracts

- [ ] 4.1 Add `IotEntity` type and `getIotEntities()` to `@pcc/contracts` (+ client test)

## 5. Frontend (TDD)

- [ ] 5.1 (TDD) Failing component test: Devices list renders entities grouped by domain and
      shows a degraded state on error
- [ ] 5.2 Implement the `/devices` page + `iot-summary` dashboard tile until 5.1 passes; wire
      the tile into the dashboard via the manifest widget id

## 6. Deployment

- [ ] 6.1 Add a `home-assistant` service to `docker-compose.yml` (image, config volume, port
      8123) and core-api env (`Plugins__Iot__Enabled`, `…BaseUrl`, token from `.env`)
- [ ] 6.2 Document the HA long-lived token in `.env.example` (secret, not committed)

## 7. Done gate

- [ ] 7.1 .NET gates green: `dotnet build`, `dotnet format --verify-no-changes`, `dotnet test`
- [ ] 7.2 Frontend gates green: `nx run-many -t typecheck lint test build` + `prettier --check`
- [ ] 7.3 E2E (manual): `docker compose up`, onboard HA + create token, confirm `/devices`
      lists real entities; disabling `Plugins:Iot:Enabled` removes it everywhere
