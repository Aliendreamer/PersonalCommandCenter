# PersonalCommandCenter — Walking Skeleton Design

**Date:** 2026-06-09
**Status:** Approved (design); pending implementation plan
**Author:** Aliendreamer + Claude

## Context

PersonalCommandCenter is a personal control center / dashboard for the home: managing
home-network devices, storage, files, and WiFi/IoT devices (router, washing machine,
air purifiers, mesh, etc.), deployed on the local network first, with Tailscale for
remote access later.

The full product is a **platform of independent subsystems**, not a single feature. It is
built **one subsystem at a time**, each with its own spec → plan → build cycle. This
document specifies only the **walking skeleton**: the thin end-to-end foundation every
subsystem plugs into.

## Locked architectural decisions

These apply to the whole product, not just the skeleton:

- **Hybrid integration strategy.** Home Assistant runs as a container *under* the app and
  acts as the device engine for IoT/devices; the app's own plugins handle everything HA
  does not (storage, files, network specifics). The UI never talks to HA directly — always
  through the core API, so HA stays an internal implementation detail.
- **Plugin model: compile-time modules, activated via `appsettings`.** All plugins live in
  the Nx monorepo and are referenced at build time. At startup the core reads `appsettings`
  to decide *which* plugins to activate and hands each its config section. Toggling a plugin
  is a config change + restart, not a rebuild. No runtime DLL loading.
- **Plugin UI mirrors backend modules, config-driven.** Each plugin has a matching frontend
  Nx library (routes + widgets). The shell fetches the enabled-plugin manifest from the
  backend and renders only those nav entries / dashboard tiles, lazy-loading their routes.
- **Stack:** Nx monorepo · .NET backend · TanStack Start frontend.
- **Deploy:** Docker + docker-compose, local network first, Tailscale later.
- **Workflow/tooling:** spec-driven; Serena + configured skills/MCPs; TDD throughout.

### Known feasibility caveat (not part of the skeleton)

Creating networks/SSIDs/VLANs on TP-Link Deco has no stable API (HA or direct). The
network subsystem, when built, should start as read-only/monitoring. Recorded here so it is
not forgotten; out of scope for the skeleton.

## Goal of the walking skeleton

Prove the entire pipeline end to end while it is tiny: monorepo → build → containers →
compose → local deploy → UI shows live data from the backend **through the plugin
mechanism**.

### In scope

Nx monorepo; core .NET API (plugin host); the plugin contract; one sample plugin activated
via `appsettings`; TanStack Start shell that renders enabled plugins; docker-compose;
local-network run.

### Explicitly deferred (each its own later spec)

Home Assistant + IoT plugin; storage / files / network plugins; authentication;
database / persistence; Tailscale remote access; real device logic.

## Monorepo layout (Nx)

```
apps/
  core-api/         .NET — plugin host: registry, /api/plugins manifest, /health
  web/              TanStack Start — shell: nav, dashboard, lazy-loads plugin UI
libs/
  contracts/        shared TS types (PluginManifest, etc.) + OpenAPI-generated client
plugins/
  system/
    system.api/     .NET module — implements IPlugin (the sample plugin)
    system.ui/      React lib — one nav entry + one dashboard tile
docker-compose.yml
```

## The plugin contract

**Backend** — each plugin implements:

```csharp
public interface IPlugin {
    string Id { get; }                                         // "system"
    PluginManifest Manifest { get; }                           // nav label, widget ids, route base
    void Configure(IServiceCollection s, IConfiguration cfg);  // its DI + options
    void MapEndpoints(IEndpointRouteBuilder e);                // its HTTP routes
}
```

At startup the core scans for `IPlugin` implementations, reads `appsettings →
Plugins:{id}:Enabled`, and activates only the enabled ones — handing each its config
section via `Configure`.

Example configuration:

```jsonc
"Plugins": {
  "System": { "Enabled": true }
}
```

**Manifest endpoint** — `GET /api/plugins` returns the enabled plugins' manifests
(id, nav label, widget ids, route base).

**Frontend** — the shell calls `/api/plugins` on load, renders nav entries + dashboard
tiles for enabled plugins only, and lazy-loads each plugin UI library's routes.

## The sample plugin: `system`

A trivial-but-real plugin that exercises every layer: backend module, config activation,
manifest, frontend tile + page.

- **Backend:** exposes `GET /api/system/status` → `{ apiHealthy, version, uptime, hostname }`.
- **Frontend:** a "System" nav entry + a dashboard tile showing live status (polled), plus a
  small detail page.
- **Config:** `"Plugins": { "System": { "Enabled": true } }`. Flipping it to `false` and
  restarting removes the plugin from both the API and the UI. That round-trip is the proof
  the architecture works.

## Data flow

```
web shell --GET /api/plugins-------> core-api --(enabled manifests)--> shell renders nav + tiles
system tile --GET /api/system/status--> core-api --> system plugin --> { healthy, version, ... }
```

## Deployment (docker-compose)

Two services for now: `web` and `core-api`, on a shared local network, ports published to
the LAN. Structured so that adding a plugin needing its own infra (e.g. `home-assistant`
later) is just another service. `.env` for config; `appsettings` overridden per environment.

## Error handling

- A plugin that fails to activate (bad config, exception in `Configure`) is logged and
  skipped; the core and other plugins continue. The failed plugin is omitted from
  `/api/plugins`.
- The shell tolerates an empty or partial manifest (renders an empty dashboard rather than
  crashing) and shows a non-blocking error if `/api/plugins` is unreachable.
- The `system` tile shows a degraded/error state if `/api/system/status` fails, rather than
  breaking the dashboard.

## Testing (TDD throughout)

- **core-api:** unit tests for the plugin registry (enabled/disabled activation from config);
  integration tests hitting `/api/plugins` and `/api/system/status`.
- **web:** component test that the shell renders nav/tiles from a mocked manifest and hides
  disabled plugins.

## Success criteria

1. `docker-compose up` brings up `web` + `core-api` on the local network.
2. The web shell shows a "System" nav entry and a live status tile sourced from
   `/api/system/status`.
3. Setting `Plugins:System:Enabled = false` and restarting removes System from both
   `/api/plugins` and the UI.
4. Tests above pass.
