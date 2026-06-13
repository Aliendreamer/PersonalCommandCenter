# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**PersonalCommandCenter** — a personal command-center / dashboard. A .NET 10 minimal-API host
serves a plugin-based backend; a TanStack Start (React, SSR) web shell discovers enabled
plugins from a manifest and renders their nav entries, dashboard tiles, and routes. First
plugins: `system` (host status) and `iot` (read-only Home Assistant monitoring).

## Stack & layout

Polyglot monorepo: **pnpm workspace + Nx** for the TypeScript side, a **.slnx** solution for
the .NET side. Package manager **pnpm@10.x**, **.NET SDK 10**.

```
apps/core-api          .NET 10 ASP.NET minimal-API host (CoreApi.csproj); OpenAPI + Scalar UI at /scalar
apps/web               TanStack Start SSR shell (React); prod served by srvx
libs/plugin-abstractions  .NET IPlugin + PluginManifest contract (Pcc.Plugins)
libs/contracts         Shared TS types + typed API client (@pcc/contracts)
plugins/system         SystemPlugin classlib  (id "system")
plugins/iot            IotPlugin classlib     (id "iot", Home Assistant)
tests/CoreApi.Tests    xUnit + Mvc.Testing integration/unit tests
openspec/              Spec-driven change workflow (proposals → specs → tasks → archive)
tools/release.mjs      Nx release wrapper
docker-compose.yml     core-api (:5080) + web (:3000) + home-assistant (:8123)
```

## Commands

```bash
# .NET (run from repo root; the .slnx is auto-detected)
dotnet build                              # warnings are errors (see Gotchas)
dotnet test                               # all CoreApi.Tests
dotnet test --filter FullyQualifiedName~IotEndpointTests   # a single test class
dotnet format --verify-no-changes         # code-STYLE gate (IDExxxx); `dotnet format` to fix

# Frontend / TS (Nx)
pnpm typecheck        # nx run-many -t typecheck   (per-project: nx typecheck web)
pnpm lint             # nx run-many -t lint
pnpm test             # nx run-many -t test        (vitest)
pnpm build            # nx run-many -t build
pnpm format:check     # prettier --check .         (`pnpm format` to fix)
pnpm --filter web dev # vite dev server on :3000

# Full stack
docker compose up -d --build              # core-api :5080, web :3000, home-assistant :8123

# Release (Nx, conventional commits; projects: web + @pcc/contracts, fixed versioning)
pnpm release:dry
```

## Architecture: the plugin model

The host does **not** dynamically scan assemblies. Plugins are registered at **compile time**
in `apps/core-api/Program.cs`:

```csharp
Assembly[] pluginAssemblies = [typeof(SystemStatusPlugin).Assembly, typeof(IotPlugin).Assembly];
```

A `PluginRegistry` activates only plugins whose `Plugins:{Id}:Enabled` config is `true`, exposes
their manifests at `GET /api/plugins`, and calls each enabled plugin's `MapEndpoints`. An
`IPlugin` (`libs/plugin-abstractions`) supplies an `Id`, a `PluginManifest` (nav label, route
base, widget ids), `Configure(services, config)` (its own config section), and `MapEndpoints`.
The web shell fetches `/api/plugins` and renders nav + tiles + lazy routes, degrading gracefully
when a plugin endpoint fails (e.g. IoT → 502 shows a "Devices unavailable" state).

### Adding a plugin (the non-obvious part)

Because wiring is compile-time, a new plugin must be added in **three** places, or it won't load:
1. `plugins/<name>/<name>.api/` — classlib implementing `IPlugin`
2. `apps/core-api/CoreApi.csproj` — a `<ProjectReference>` to it
3. `apps/core-api/Program.cs` — its assembly in the `pluginAssemblies` array
4. `PersonalCommandCenter.slnx` — register the project in the solution

Follow the TDD ordering used by `iot`/`system`: client/unit tests → endpoint integration tests
→ `@pcc/contracts` type + client → web component test → page + dashboard tile.

## Workflow (required)

Every change: **OpenSpec proposal → TDD → all gates green before "done"** (see the `dev-flow`
skill and `openspec/`). Commit directly on `main` (no `feat/*` branches for now). Gates =
`dotnet build` + `dotnet test` + `dotnet format --verify-no-changes` and
`pnpm typecheck/lint/test/build` + `pnpm format:check`.

## Gotchas

- **Warnings are errors** (`Directory.Build.props`: `TreatWarningsAsErrors=true`). Compiler +
  analyzer (CAxxxx) warnings fail `dotnet build`; code STYLE (IDExxxx) is a separate gate via
  `dotnet format`. `Nullable` + `ImplicitUsings` are on.
- **Plugins are compile-time**, not auto-discovered — see "Adding a plugin" above.
- **srvx `--static` is resolved relative to the server-entry directory**, not the cwd. The web
  prod command uses `-s ../client` (sibling of `dist/server`); `-s dist/client` silently
  disables static serving and every `/assets/*` 404s. (See `apps/web/Dockerfile`.)
- **CORS** is locked to the web origin (`Web__Origins`, default `http://localhost:3000`).
- **IoT needs a Home Assistant token** in `.env` (`HA_TOKEN`, gitignored); without it
  `/api/iot/entities` returns 502 by design.
