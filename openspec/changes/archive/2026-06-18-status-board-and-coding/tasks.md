## 1. Confirm the Wakapi data contract

- [x] 1.1 Against the live internal Wakapi, confirm the endpoint(s) for this-week totals + project/
  language breakdown and the per-day array; record the exact paths, auth header, and JSON shape
  → `GET /api/compat/wakatime/v1/users/current/summaries?range=week`, Basic `base64(apiKey)`;
  `cumulative_total.seconds` = week, `data[].grand_total.total_seconds` + `range.start` = per-day
  (last = today), `data[].projects[]`/`languages[]` (`name`,`total_seconds`) summed by name = breakdown
- [x] 1.2 Finalize the `CodingStatus` field list: `WeekSeconds`, `TodaySeconds`, `Days[{Date,Seconds}]`,
  `Projects[{Name,Seconds}]`, `Languages[{Name,Seconds}]` (raw seconds; web formats to `18h 04m`)

## 2. Coding plugin backend (TDD)

- [x] 2.1 Scaffold `plugins/coding/coding.api/` classlib (`Pcc.Plugins.Coding`); add to `.slnx`
- [x] 2.2 Write `CodingClientTests` (mocked `HttpMessageHandler`): parses week/today/days/projects/
  languages; Basic auth header is `base64(apiKey)`; empty key and non-2xx → throw — watch them fail
- [x] 2.3 Implement `CodingOptions`, `CodingStatus`, `ICodingClient`/`CodingClient` until green
- [x] 2.4 Write `CodingEndpointTests` (Mvc.Testing): authed `GET /api/coding` → 200 with shape; client
  failure → 502; disabled plugin → not served / absent from `/api/plugins` — watch them fail
- [x] 2.5 Implement `CodingPlugin` (manifest `("coding","Coding","/coding",["coding-status"])`) +
  `GetCodingEndpoint` (Resolve, try→Ok, catch→502) until green
- [x] 2.6 Wire compile-time: `CoreApi.csproj` ProjectReference, `Program.cs` `pluginAssemblies`,
  `appsettings` `Plugins:Coding:{Enabled,BaseUrl,ApiKey}` (BaseUrl `http://wakapi:3000`); compose env
- [x] 2.7 Add `WAKAPI_API_KEY` to `.env.example`; document in `DOCKER_SETUP.md`; confirm key
  stays gitignored (`.env` is gitignored)

## 3. Contracts + server function

- [x] 3.1 Add `CodingStatus` (+ nested types) to `@pcc/contracts` and a typed client method (+ test)
- [x] 3.2 Add `getCoding()` server function in `lib/server/api.ts` + `loadCoding` loader

## 4. Health derivation (TDD)

- [x] 4.1 Write `lib/health.test.ts`: `deriveHealth` → `down` on error, `degraded` on partial/empty-
  from-source, `ok` otherwise incl. valid zero-activity — watch it fail
- [x] 4.2 Implement `lib/health.ts` (`deriveHealth`, `healthColor`, `healthCount`) green
- [x] 4.3 Health colors use Mantine's built-in `green`/`yellow`/`red` via `healthColor` (no `theme.ts`
  override needed; `theme.ts` only defines the `sky` primary, which stays)

## 5. Status-board shell (TDD)

- [x] 5.1 Write `dashboard-hero.test.tsx`: renders date/time + greeting; shows `N/total` from a passed
  health array — watch it fail
- [x] 5.2 Implement `components/dashboard-hero.tsx` (presentation-only, client-side live clock) green
- [x] 5.3 Update `plugin-shell.test`: per-tile accent + status dot from a health prop, hero slot
  (nav active-highlight dropped — the nav renders only on the home dashboard, where no plugin route
  is active, and `useLocation` would break the router-less component test)
- [x] 5.4 Restyle `components/plugin-shell.tsx`: hero slot, uniform card anatomy (left accent + header
  lucide icon/title/status-dot), nav lucide icons until green

## 6. Coding tile + page (TDD)

- [x] 6.1 Write `coding-status-tile.test.tsx`: headline week total + secondary today; degraded notice
  on error — watch fail
- [x] 6.2 Implement `components/coding-status-tile.tsx` (+ `lib/duration.ts` `formatDuration`) green
- [x] 6.3 Write `coding-view.test.tsx`: week total, per-day strip, projects + languages
- [x] 6.4 Implement `components/coding-view.tsx` + `routes/_authenticated/coding.tsx` (settle) green

## 7. Wire the board together

- [x] 7.1 Update `routes/_authenticated/index.tsx`: add `getCoding` to the settled loader; compute one
  health per tile (`settledFor`+`deriveHealth`); pass healths to the hero and `tileHealth` to the
  shell; add the `coding-status` tile branch

## 8. E2E + gates

- [x] 8.1 Add a `coding.spec.ts` E2E asserting the board renders the hero (Status summary + count),
  the coding tile + health dot, and the `/coding` page — passed against the live rebuilt stack;
  screenshot confirmed real Wakapi data ("4h 26m this week") + the design (icons, accents, symmetry)
- [x] 8.2 Run all gates green: `dotnet build` (0 err) · `dotnet format` (0) · `dotnet test` (144);
  `nx` typecheck · lint · test (114) · build · `prettier --check .` — all green, output read
- [x] 8.3 Tick the OpenSpec tasks, request review, then archive the change

Note: the core-api **Dockerfile** is a 5th compile-time wiring place (it COPYs each plugin csproj +
source explicitly) — added the two `coding` COPY lines so the container build includes the plugin.
