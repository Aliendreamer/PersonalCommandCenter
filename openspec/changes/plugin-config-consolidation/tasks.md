## 1. Container-address defaults on Options

- [x] 1.1 Set container defaults: `CalendarOptions.BaseUrl`/`TaskOptions.BaseUrl` → `http://radicale:5232`,
  `IotOptions.HomeAssistant.BaseUrl` → `http://home-assistant:8123`, `SearchOptions.BaseUrl` →
  `http://searxng:8080`, `GpuOptions.ExporterUrl` → `http://gpu-exporter:9835/metrics`
- [x] 1.2 Set host `NtfyOptions` defaults → `BaseUrl http://ntfy:80`, `Topic pcc` (find its class)
- [x] 1.3 Add/adjust unit tests asserting each affected `Options` default is the container address

## 2. appsettings layering

- [x] 2.1 Move every localhost address currently in `appsettings.json` into
  `appsettings.Development.json` (Calendar/Tasks `5232`, Iot HA `8123`, Search `8888`/`searxng` host
  port, Models Ollama `11434`, Uptime self-target as needed)
- [x] 2.2 Trim `appsettings.json` `Plugins` to: `Enabled` per plugin + non-secret deployment config
  (Weather lat/long + ForecastDays, RSS feeds + MaxItems, Uptime targets + timeout, IoT domains,
  Calendar/Tasks Collection + WindowDays, Goodreads Shelf) + committed dev-default CalDAV creds
- [x] 2.3 Remove address + secret keys from `appsettings.json` (no `BaseUrl`/`Token`/`ApiKey`/`UserId`)

## 3. Secrets via .env + env_file

- [x] 3.1 Rewrite `.env` to .NET-style secret keys: `Plugins__Iot__HomeAssistant__Token`,
  `Plugins__Calendar__Password`, `Plugins__Tasks__Password`, `Plugins__Coding__ApiKey`,
  `Plugins__Goodreads__UserId` (migrate the existing `WAKAPI_API_KEY` value across)
- [x] 3.2 Update `.env.example` to document those keys (empty values) + a note on the rename
- [x] 3.3 Confirm `.env` stays gitignored

## 4. Clean docker-compose

- [x] 4.1 Delete every `Plugins__*` line from the core-api `environment:` block
- [x] 4.2 Add `env_file: .env` to the core-api service; keep only infra env (ASPNETCORE/OTEL) and the
  existing non-plugin `Auth`/`ConnectionStrings`/`Web` lines

## 5. Verify (gates + live stack)

- [x] 5.1 `.NET` gates green: `dotnet build` · `dotnet format --verify-no-changes` · `dotnet test`
  (all existing per-plugin endpoint/disabled tests still pass — proves effective config unchanged)
- [x] 5.2 Rebuild + boot the stack; confirm the dashboard tiles resolve config (Calendar/Tasks/Search/
  Models/Coding reach their upstreams; secrets-driven ones use `.env`)
- [x] 5.3 Run the live E2E (or a smoke) — board renders, no plugin regressed
- [x] 5.4 Update `DOCKER_SETUP.md` + `CLAUDE.md` config notes for the new layering

## 6. Docs

- [x] 6.1 Note in `CLAUDE.md` that plugin config is layered (Options default → appsettings → .env) and
  that compose carries no plugin config
