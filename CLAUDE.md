# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**PersonalCommandCenter** — a personal command-center / dashboard. A .NET 10 **FastEndpoints**
host serves a plugin-based backend; a TanStack Start (React, SSR) web shell discovers enabled
plugins from a manifest and renders their nav entries, dashboard tiles, and routes. The whole app
sits **behind Keycloak login** (BFF cookie-session auth). First plugins: `system` (host status)
and `iot` (read-only Home Assistant monitoring).

## Stack & layout

Polyglot monorepo: **pnpm workspace + Nx** for the TypeScript side, a **.slnx** solution for
the .NET side. Package manager **pnpm@10.x**, **.NET SDK 10**.

```
apps/core-api          .NET 10 FastEndpoints host (CoreApi.csproj); BFF auth (Auth/), EF (Data/); Scalar at /scalar
apps/web               TanStack Start SSR shell (React); prod served by srvx; whole app behind login
libs/plugin-abstractions  .NET IPlugin + PluginManifest contract (Pcc.Plugins)
libs/contracts         Shared TS types + typed API client (@pcc/contracts)
plugins/system         SystemPlugin classlib  (id "system")
plugins/iot            IotPlugin classlib     (id "iot", Home Assistant)
tests/CoreApi.Tests    xUnit + Mvc.Testing integration/unit tests
harness/keycloak       Pcc realm import (roles Admin/User, client pcc_api, testuser/Test123!)
harness/traefik        Traefik file-provider routes (*.pcc.localhost)
openspec/              Spec-driven change workflow (proposals → specs → tasks → archive)
docker-compose.yml     Traefik + core-api + web + home-assistant + keycloak + postgres
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

# Full stack — everything behind Traefik on http://*.pcc.localhost (only Traefik publishes :80)
docker compose up -d --build              # app. / api. / keycloak. / ha. / portainer.pcc.localhost
# curl through Traefik (curl won't auto-resolve *.localhost like a browser does):
#   curl -H "Host: api.pcc.localhost" http://127.0.0.1/health

# Release (Nx, conventional commits; projects: web + @pcc/contracts, fixed versioning)
pnpm release:dry
```

## Architecture: the plugin model

The host does **not** dynamically scan assemblies. Plugins are registered at **compile time**
in `apps/core-api/Program.cs`:

```csharp
Assembly[] pluginAssemblies = [typeof(SystemStatusPlugin).Assembly, typeof(IotPlugin).Assembly];
```

A `PluginRegistry` activates only plugins whose `Plugins:{Id}:Enabled` config is `true` and exposes
their manifests at `GET /api/plugins`. An `IPlugin` (`libs/plugin-abstractions`) supplies an `Id`,
a `PluginManifest` (nav label, route base, widget ids), and `Configure(services, config)`. A
plugin's HTTP routes are **FastEndpoints endpoint classes** in its assembly (no `MapEndpoints`);
`UseFastEndpoints` registers them with prefix `api` and a `Endpoints.Filter` that drops endpoints
from disabled plugins' assemblies. The web shell fetches `/api/plugins` (client-side, credentialed,
after the `/me` gate) and renders nav + tiles, degrading gracefully on failure (IoT → 502).

**Auth (BFF "World B"):** the API owns the Keycloak OIDC exchange + tokens; the browser holds only
an opaque `HttpOnly` `mp_sid` cookie; a Postgres session store (`Auth/SessionService`) gives instant
revocation. Endpoints `api/auth/login|callback|logout` + `api/me`; everything else requires a
session. Auth is host-level (`apps/core-api/Auth/`), not a plugin. See `bff-auth-template.md`.

### Adding a plugin (the non-obvious part)

Because wiring is compile-time, a new plugin must be added in **three** places, or it won't load:
1. `plugins/<name>/<name>.api/` — classlib implementing `IPlugin` + FastEndpoints endpoint classes
2. `apps/core-api/CoreApi.csproj` — a `<ProjectReference>` to it
3. `apps/core-api/Program.cs` — its assembly in the `pluginAssemblies` array
4. `PersonalCommandCenter.slnx` — register the project in the solution

Plugin endpoints require auth by default; use lazy `Resolve<T>()` (not constructor injection) for
plugin services so the host can instantiate the endpoint at startup even when the plugin is disabled.

Follow the TDD ordering used by `iot`/`system`: client/unit tests → endpoint integration tests
→ `@pcc/contracts` type + client → web component test → page + dashboard tile.

## Workflow (required)

Every change: **OpenSpec proposal → TDD → all gates green before "done"** (see the `dev-flow`
skill and `openspec/`). Commit directly on `main` (no `feat/*` branches for now). Gates =
`dotnet build` + `dotnet test` + `dotnet format --verify-no-changes` and
`pnpm typecheck/lint/test/build` + `pnpm format:check`.

**Frontend (apps/web) — always load TanStack skills first.** Before substantial frontend work,
run the TanStack intent skill check and load the matching skill (see `AGENTS.md`):

```bash
pnpm dlx @tanstack/intent@latest list                 # see available skills
pnpm dlx @tanstack/intent@latest load <package>#<skill> # then follow the returned SKILL.md
```

## Gotchas

- **Warnings are errors** (`Directory.Build.props`: `TreatWarningsAsErrors=true`). Compiler +
  analyzer (CAxxxx) warnings fail `dotnet build`; code STYLE (IDExxxx) is a separate gate via
  `dotnet format`. `Nullable` + `ImplicitUsings` are on.
- **Plugins are compile-time**, not auto-discovered — see "Adding a plugin" above.
- **srvx `--static` is resolved relative to the server-entry directory**, not the cwd. The web
  prod command uses `-s ../client` (sibling of `dist/server`); `-s dist/client` silently
  disables static serving and every `/assets/*` 404s. (See `apps/web/Dockerfile`.)
- **CORS** is locked to the web origin (`Web__Origins`, `http://app.pcc.localhost`) with
  `AllowCredentials` (the session cookie rides along) — never `*`.
- **IoT needs a Home Assistant token** in `.env` (`HA_TOKEN`, gitignored); without it
  `/api/iot/entities` returns 502 by design.
- **Everything is behind Traefik on `*.pcc.localhost`** (`app./api./keycloak./ha./portainer.`).
  `app.` and `api.` share `pcc.localhost` so the `mp_sid` cookie is same-site (`SameSite=Lax`).
  Browsers auto-resolve `*.localhost`; `curl` needs `-H "Host: …" http://127.0.0.1`.
- **Traefik uses the file provider** (`harness/traefik/dynamic.yml`), not docker labels — its
  docker provider can't negotiate with this daemon (min API 1.40). Add new routes there.
- **JwtBearer `RequireHttpsMetadata`** is derived from the Authority scheme; the local harness is
  HTTP (`http://keycloak.pcc.localhost`), so it's off — don't hardcode it true.
- **EF migrations apply on startup** outside Development (`Database.MigrateAsync` in `Program.cs`);
  generate with `dotnet ef migrations add <Name> --project apps/core-api --output-dir Data/Migrations`.
- **FE is whole-app-behind-login**: the browser calls `api.pcc.localhost` directly (credentialed,
  no FE→API proxy); `AuthProvider` gates on `/api/me` client-side. `VITE_API_URL` is the API
  **origin** (the contracts client appends `/api/...`).
