## Context

The home page (`apps/web/src/routes/_authenticated/index.tsx` + `components/plugin-shell.tsx`)
renders a fixed 192px vertical nav and a `SimpleGrid` of identical bordered `Paper` tiles, one per
enabled plugin. Each tile shows a title and a body, every tile the same weight, with no signal of
which (if any) data source is unhealthy. The loader already `settle()`s every source independently,
so each tile component receives `{ data, error }` — the information needed for a health signal
already exists; it is simply not surfaced.

Separately, the self-hosted Wakapi instance (internal `wakapi:3000`, host-published `:3030`, browser
route `wakapi.pcc.localhost`) now reliably receives coding heartbeats, but no plugin reads it.

Constraints: plugins are compile-time modules wired in four places; read-only plugins degrade to 502
on upstream failure (per `models`/`calendar`); the browser never calls core-api directly (SSR-BFF);
UI is Mantine v9 with a sky primary and cookie-driven dark default; secrets live in gitignored `.env`.

## Goals / Non-Goals

**Goals:**
- A calm, symmetric at-a-glance status board: vertical menu + hero strip + uniform card grid.
- A single, consistent per-tile health signal (green/amber/red) and an aggregate hero count.
- A read-only `coding` plugin surfacing this-week + today coding time, projects, and languages.
- Zero new runtime dependencies; reuse the existing `settle()` load result for health.

**Non-Goals:**
- No attention-based reordering or problem-jump banner — the layout is **fixed**; health is shown
  by color only. (The hero count is a glance summary, not a triage control.)
- No new backend, contract, or DB for health — it is derived entirely client-side.
- No write path; `coding` is read-only. No per-day editing, goals, or leaderboards.
- No new container — `coding` reads the existing Wakapi.

## Decisions

**1. Health derived client-side from `settle()` `{data, error}`, not a new backend field.**
Each tile already gets its load result. A shared `deriveHealth(data, error, opts)` in `lib/health.ts`
returns `'ok' | 'degraded' | 'down'`: `error` → `down`; a per-tile "empty/partial" predicate →
`degraded`; otherwise `ok`. Alternative (a backend health contract per plugin) was rejected as
redundant — it would re-encode what the 502/empty-payload already tells us, and couple every plugin
to a health schema. Mapping to Mantine colors: `ok→green`, `degraded→yellow`, `down→red`.

**2. Hero is presentation-only.** `DashboardHero` takes the list of derived tile healths plus the
current time and renders date/time, a greeting, and `N/total` green count. It holds no business
logic and is independently testable. Time is rendered client-side to avoid SSR/locale hydration skew.

**3. Uniform card anatomy lives in `PluginShell`.** The grid stays `SimpleGrid cols={{base:1,sm:2,lg:3}}`
(symmetry preserved). Each `Paper` gains a left `borderLeft` accent in the health color, a header
`Group` of `lucide` icon + title + a status-dot, and renders the existing `renderTile` body below.
Icon per plugin id comes from a small `id→LucideIcon` map (fallback generic icon). Nav entries reuse
the same map and add an active-route highlight via `useLocation`.

**4. `coding` plugin mirrors `models` exactly.** `ICodingClient`/`CodingClient` (typed `HttpClient`),
`CodingOptions` bound from `Plugins:Coding`, `CodingStatus` record, one `GetCodingEndpoint`
(`Get("/coding")`, `Resolve<ICodingClient>()`, try → `Ok`, catch → `502`). Wakapi auth is HTTP Basic
with `base64(apiKey)` as the username (WakaTime convention). Reads two compat/native endpoints
server-side: this-week totals + project/language breakdown, and the per-day summaries array. Empty
`ApiKey` or unreachable host → throw → 502 (tile red). `BaseUrl` defaults to `http://wakapi:3000`
(internal compose network — **not** the host `:3030` port, which exists only for the WSL CLI).

**5. `CodingStatus` shape (contract).** `{ weekSeconds, todaySeconds, days: {date, seconds}[],
projects: {name, seconds}[], languages: {name, seconds}[] }`. Formatting (`18h 04m`) is done in the
web layer, not the API, so the contract stays raw numbers.

## Risks / Trade-offs

- **Wakapi API key is a shared secret in `.env`** → mirror the `HA_TOKEN` pattern (gitignored,
  `.env.example` documents it); `BaseUrl` is committed, key is not. Missing key → clean 502, not a crash.
- **"Empty = degraded" can mislead on a genuinely idle day** (no coding today shows amber) →
  scope the degraded predicate to *source* problems (partial/failed sub-fetch), and treat a valid
  zero-activity week as `ok` (green), not degraded.
- **Per-day Wakapi endpoint shape may differ from the today/week endpoints** → confirm the exact
  endpoint and JSON against the live instance in the first implementation task before coding the client.
- **Hero health count drifts from per-tile dots if logic is duplicated** → single source: the page
  computes one health per tile and passes both the dots and the count from the same array.
- **Adding header/accent to every tile risks visual noise** → keep the accent thin (3px) and the dot
  small; rely on the shared theme colors so light/dark both read well.

## Migration Plan

Additive only. The `coding` plugin is gated by `Plugins:Coding:Enabled` (default off until the key is
set), so the board renders unchanged where Wakapi/key is absent. No data migration. Rollback = disable
the plugin and revert the shell restyle; no persisted state is introduced.

## Open Questions

- ~~Exact Wakapi endpoint(s) for this-week-with-per-day~~ **Resolved (task 1):** a single call to
  `GET {BaseUrl}/api/compat/wakatime/v1/users/current/summaries?range=week` (Basic
  `base64(apiKey)`) returns everything — `cumulative_total.seconds` (week total), a `data[]` per-day
  array (each `grand_total.total_seconds` + `range.start` date; last element = today), and per-day
  `projects[]`/`languages[]` (`name` + `total_seconds`) which `CodingClient` sums by name across the
  week for the breakdown. No second call needed.
