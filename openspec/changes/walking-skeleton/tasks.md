## 1. Monorepo & tooling

- [x] 1.1 Initialize the Nx workspace at repo root (package manager: pnpm)
- [x] 1.2 Add the `apps/`, `libs/`, `plugins/` structure and shared TS/lint/prettier config
- [x] 1.3 Configure Nx targets: `lint`, `test`, `build`, `typecheck` (so `nx affected` works)
- [x] 1.4 Add `.editorconfig` and `Directory.Build.props` (warnings-as-errors) for .NET

## 2. Core API skeleton (apps/core-api)

- [x] 2.1 Scaffold the .NET minimal-API project `apps/core-api` with a `/health` endpoint
- [x] 2.2 Add the xUnit test project for core-api
- [x] 2.3 (TDD) Write a failing integration test: `GET /health` returns 200
- [x] 2.4 Implement until 2.3 passes

## 3. Plugin host (capability: plugin-host)

- [x] 3.1 (TDD) Write failing unit tests for the registry: enabled plugin activates, disabled
      plugin does not, failing plugin is skipped (defensive activation)
- [x] 3.2 Define the `IPlugin` contract (`Id`, `Manifest`, `Configure`, `MapEndpoints`) and
      the `PluginManifest` model
- [x] 3.3 Implement startup discovery + `appsettings` (`Plugins:{id}:Enabled`) activation,
      passing each plugin its config section; isolate failures (log + skip + continue)
- [x] 3.4 (TDD) Write a failing integration test: `GET /api/plugins` lists only enabled plugins
- [x] 3.5 Implement the `GET /api/plugins` manifest endpoint until 3.1 and 3.4 pass

## 4. System plugin (capability: system-plugin)

- [x] 4.1 Create `plugins/system/system.api` implementing `IPlugin`
- [x] 4.2 (TDD) Write a failing test: `GET /api/system/status` returns
      `{ apiHealthy, version, uptime, hostname }`
- [x] 4.3 Implement the status endpoint until 4.2 passes
- [x] 4.4 (TDD) Write a failing test: with `Plugins:System:Enabled = false`, status is
      unserved and `system` is absent from `/api/plugins`
- [x] 4.5 Implement/verify config-driven round-trip until 4.4 passes

## 5. Shared contracts (libs/contracts)

- [x] 5.1 Define shared TS types (`PluginManifest`, `SystemStatus`) in `libs/contracts`
- [x] 5.2 Generate/align the typed API client from core-api's OpenAPI (Scalar/OpenAPI is the
      source of truth; client hand-written + tested, codegen deferred until the API grows)

## 6. Web shell (capability: web-shell, apps/web)

- [x] 6.1 Scaffold the TanStack Start app `apps/web` (official scaffolder, SSR, React 19)
- [x] 6.2 (TDD) Write a failing component test: shell renders nav/tiles from a mocked
      manifest and hides plugins absent from it
- [x] 6.3 Implement manifest fetch + nav/tile rendering for enabled plugins until 6.2 passes
- [x] 6.4 Implement lazy-loading of each enabled plugin's `*.ui` routes (React.lazy `/system`
      route → separate `system-page` chunk confirmed in the build)
- [x] 6.5 (TDD) Write a failing test: unreachable manifest → empty dashboard + non-blocking
      error; implement graceful degradation until it passes

## 7. System plugin UI (plugins/system/system.ui)

- [x] 7.1 Create the system plugin UI: dashboard tile + detail page. NOTE: for the skeleton
      these live in `apps/web` (`src/components/system-*`); extracting to a standalone
      `plugins/system/system.ui` package is deferred to keep one frontend toolchain for now.
- [x] 7.2 (TDD) Write a failing test: tile shows live status, and a degraded state on error
- [x] 7.3 Implement the tile + detail page until 7.2 passes

## 8. Deployment (docker-compose)

- [x] 8.1 Add Dockerfiles for `core-api` (.NET multi-stage) and `web` (node + srvx serving
      the SSR build), plus `.dockerignore`
- [x] 8.2 Add `docker-compose.yml` (services `web` + `core-api`) and `.env.example`; core-api
      gets CORS so the browser-side tile can reach it
- [x] 8.3 Verify `docker compose up` serves the shell with the System nav/tile (SSR renders
      from the manifest; /health, /api/plugins, /api/system/status all 200 in containers)

## 9. Done gate (dev-flow quality gates — all must be green)

- [x] 9.1 .NET gates green: `dotnet build` (warnings-as-errors), `dotnet format
      --verify-no-changes`, `dotnet test` (8 passing)
- [x] 9.2 Frontend gates green: `nx run-many -t typecheck lint test build` (2 projects) +
      `prettier --check` (7 frontend tests passing)
- [x] 9.3 Round-trip verified in containers: with `Plugins__System__Enabled=false`,
      `/api/plugins` → `[]` and `/api/system/status` → 404; enabled → System renders
- [ ] 9.4 Request code review before merge (user-triggered, e.g. `/code-review`)
