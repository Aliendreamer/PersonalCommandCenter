## Why

The home entrance page renders every plugin as an identical, unstyled bordered tile — a flat
grid of boxes with no point of view. It does not tell the user, at a glance, whether anything
needs attention. Separately, the self-hosted Wakapi instance now collects coding-activity
heartbeats but nothing in the app surfaces them. This change turns the home page into a calm
at-a-glance **status board** and adds a read-only `coding` plugin whose tile and page live on it.

## What Changes

- Restyle the dashboard shell into a **status board**: keep the vertical menu and the symmetric
  uniform card grid, but add a **hero strip** (date/time, greeting, and an aggregate health
  readout "X/Y green") above the grid, and give every tile a consistent anatomy — a left
  health-accent bar, an icon + title + **status dot** header, and one headline metric.
- Add a per-tile **health signal** derived **client-side** from the existing `settle()`
  `{data, error}` already passed to each tile: `error` → red, loaded-but-degraded/empty → amber,
  otherwise green. The hero counts the green tiles. No new backend or contract for health.
- Polish the vertical menu: per-plugin `lucide` icon, active-route highlight, hover state.
- Add a new read-only **`coding` plugin** (`GET /api/coding`) that reads the **internal** Wakapi
  instance and returns this-week totals, top projects/languages, and per-day breakdown. Wakapi
  unreachable or unconfigured → **502** (tile degrades red), consistent with `models`/`calendar`.
  - Tile: `18h 04m this week` headline + `3h 12m today` secondary.
  - Page `/coding`: this-week total, per-day strip, projects + languages breakdowns.

## Capabilities

### New Capabilities
- `coding`: read-only coding-activity board backed by the internal Wakapi server — a
  `GET /api/coding` endpoint, a dashboard tile, and a `/coding` page; degrades to 502 when
  Wakapi is unreachable or unconfigured.

### Modified Capabilities
- `web-shell`: the dashboard gains a status-board presentation — a hero strip with an aggregate
  health count and a per-tile health indicator derived from each tile's load result.

## Impact

- **New .NET**: `plugins/coding/coding.api/` classlib (`CodingPlugin`, `ICodingClient`/`CodingClient`,
  `CodingOptions`, `CodingStatus`, `GetCodingEndpoint`). Compile-time wiring in `CoreApi.csproj`,
  `Program.cs` (`pluginAssemblies`), `PersonalCommandCenter.slnx`, and `Plugins:Coding:Enabled`.
- **New web**: `components/dashboard-hero.tsx`, `components/coding-status-tile.tsx`,
  `routes/_authenticated/coding.tsx`, `lib/health.ts`.
- **Touched web**: `components/plugin-shell.tsx` (hero + card restyle + nav polish),
  `routes/_authenticated/index.tsx` (coding loader), `lib/theme.ts` (health colors; sky stays
  primary), `lib/server/api.ts` (`getCoding`), `@pcc/contracts` (`CodingStatus`).
- **Config/infra**: `Plugins:Coding:{BaseUrl,ApiKey}` in `appsettings`; `Plugins__Coding__ApiKey`
  in `.env` (gitignored, like `HA_TOKEN`); `BaseUrl` defaults to `http://wakapi:3000`.
- **Dependencies**: none new — `lucide-react` is already present.
- **Tests**: `CodingClient` unit + `GET /api/coding` integration; contracts/client; tile, hero,
  and shell component tests; an E2E that the board renders with health states.
