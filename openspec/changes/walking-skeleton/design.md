## Context

PersonalCommandCenter has no source yet. The full product is a platform of independent
subsystems built one at a time. This change builds only the **walking skeleton** — the
foundation every subsystem plugs into — and proves it end to end with one trivial plugin.

The full approved design lives at
`docs/superpowers/specs/2026-06-09-walking-skeleton-design.md`; this document captures the
key technical decisions and trade-offs.

## Goals / Non-Goals

**Goals:**
- Stand up the Nx monorepo (.NET core-api, TanStack Start web, shared contracts, plugins area).
- A plugin host: `IPlugin` contract, startup discovery, `appsettings`-driven activation,
  `GET /api/plugins` manifest.
- A web shell that renders only enabled plugins' nav/tiles and lazy-loads their UI.
- A sample `system` plugin proving the full round-trip, including config-driven disable.
- docker-compose running `web` + `core-api` on the local network.

**Non-Goals:**
- Home Assistant, IoT/storage/files/network plugins, auth, persistence, Tailscale.
- Runtime/hot plugin loading. Real device logic.

## Decisions

- **Compile-time plugin modules, activated via `appsettings`.** Plugins are referenced at
  build time; the core reads `Plugins:{id}:Enabled` at startup to decide which to register,
  passing each its config section. *Alternatives:* runtime-loaded assemblies (version/isolation
  complexity, YAGNI for a personal system) and per-plugin containers (extra moving parts).
  Compile-time + config is the simplest type-safe option; toggling is a restart, not a rebuild.
- **Plugin UI mirrors backend modules, manifest-driven.** Each plugin has a matching `*.ui`
  Nx React lib. The shell calls `/api/plugins` and renders only enabled plugins. *Alternative:*
  generic schema-driven UI (less tailored, hard for custom UIs). Symmetry with the backend
  keeps one config source of truth.
- **UI talks only to core-api.** No frontend calls bypass the core. This keeps future
  upstreams (e.g. Home Assistant) internal implementation details.
- **`IPlugin` contract:** `Id`, `Manifest` (nav label, widget ids, route base), `Configure`
  (DI + options), `MapEndpoints` (HTTP routes). The host scans implementations, filters by
  config, and wires up only the enabled ones.

## Risks / Trade-offs

- **A bad plugin shares the core process** → host activates plugins defensively: a plugin
  that throws during `Configure` is logged, skipped, and omitted from `/api/plugins`; the
  core and other plugins continue.
- **Adding a plugin requires a rebuild/redeploy** (compile-time model) → accepted; this is a
  personal system and the simplicity is worth it.
- **Manifest unreachable / partial** → the shell degrades gracefully (empty dashboard +
  non-blocking error) rather than crashing.

## Migration Plan

Greenfield — no migration. Deploy with `docker-compose up`. Rollback = stop the stack.
Plugin enable/disable is a config change + restart.

## Open Questions

None blocking. Auth and persistence are deferred to their own later changes.
