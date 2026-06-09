## Why

PersonalCommandCenter is a platform of independent subsystems (network, IoT, storage,
files) built one at a time. Before any subsystem can be built, the foundation every
subsystem plugs into must exist and be proven end to end: an Nx monorepo, a .NET core that
hosts plugins, a TanStack Start shell that renders them, and a docker-compose deployment on
the local network. Proving this pipeline while it is tiny means every later subsystem is
*just* the feature, not feature + infrastructure.

## What Changes

- Establish the **Nx monorepo** with `apps/core-api` (.NET), `apps/web` (TanStack Start),
  `libs/contracts` (shared TS types), and a `plugins/` area.
- Introduce a **plugin host** in core-api: an `IPlugin` contract, startup discovery,
  activation driven by `appsettings` (`Plugins:{id}:Enabled`), and a `GET /api/plugins`
  manifest endpoint exposing enabled plugins.
- Introduce a **web shell** that fetches the manifest and renders nav entries + dashboard
  tiles for enabled plugins only, lazy-loading each plugin's UI.
- Add a sample **`system` plugin** (`*.api` module + `*.ui` lib) exposing
  `GET /api/system/status` and a nav entry, dashboard tile, and detail page — proving the
  whole mechanism, including that disabling it via config removes it from API and UI.
- Add **docker-compose** running `web` + `core-api` on the local network.

Out of scope (each its own later change): Home Assistant + IoT plugin, storage/files/network
plugins, authentication, persistence/database, Tailscale remote access.

## Capabilities

### New Capabilities
- `plugin-host`: the .NET core's plugin contract, `appsettings`-driven activation, and the
  `/api/plugins` manifest endpoint.
- `web-shell`: the TanStack Start shell that discovers enabled plugins and renders their nav
  entries, dashboard tiles, and lazy-loaded routes.
- `system-plugin`: the sample plugin (status endpoint + UI surfaces) that exercises every
  layer end to end.

### Modified Capabilities
<!-- None — this is the first change; no existing specs. -->

## Impact

- New Nx monorepo and tooling (Nx, .NET SDK, Node/pnpm) — repo currently has no source.
- New `docker-compose.yml` and `.env` for local-network deployment.
- Establishes conventions all future plugins follow: compile-time module + `appsettings`
  activation, `*.api`/`*.ui` plugin pairing, UI-through-core boundary.
- No external services yet (Home Assistant arrives with the IoT change).
