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

- [ ] 3.1 Add `CodingStatus` (+ nested types) to `@pcc/contracts` and a typed client method
- [ ] 3.2 Add `getCoding()` server function in `lib/server/api.ts` (server-to-server, forwards cookie)

## 4. Health derivation (TDD)

- [ ] 4.1 Write `lib/health.test.ts`: `deriveHealth` → `down` on error, `degraded` on partial/empty-
  from-source, `ok` otherwise incl. valid zero-activity — watch it fail
- [ ] 4.2 Implement `lib/health.ts` (`deriveHealth`, `'ok'|'degraded'|'down'`, color/dot mapping) green
- [ ] 4.3 Add health colors to `lib/theme.ts` (green/yellow/red); sky stays primary

## 5. Status-board shell (TDD)

- [ ] 5.1 Write `dashboard-hero.test.tsx`: renders date/time + greeting; shows `N/total` from a passed
  health array — watch it fail
- [ ] 5.2 Implement `components/dashboard-hero.tsx` (presentation-only, client-side time) until green
- [ ] 5.3 Update `plugin-shell.test`/add coverage: fixed layout, per-tile accent + status dot from a
  health prop, lucide icon + active nav highlight — watch fail
- [ ] 5.4 Restyle `components/plugin-shell.tsx`: hero slot, uniform card anatomy (left accent + header
  icon/title/dot), polished nav (icon map + active highlight) until green

## 6. Coding tile + page (TDD)

- [ ] 6.1 Write `coding-status-tile.test.tsx`: headline week total + secondary today; degraded notice
  on error — watch fail
- [ ] 6.2 Implement `components/coding-status-tile.tsx` (formats seconds → `18h 04m`) until green
- [ ] 6.3 Write a route/page test for `/coding`: week total, per-day strip, projects + languages
- [ ] 6.4 Implement `routes/_authenticated/coding.tsx` (loader uses `getCoding`, settle) until green

## 7. Wire the board together

- [ ] 7.1 Update `routes/_authenticated/index.tsx`: add `getCoding` to the settled loader; compute one
  health per tile; pass healths to the hero and dots to tiles; add the `coding-status` tile branch

## 8. E2E + gates

- [ ] 8.1 Add/extend an E2E asserting the board renders the hero, the coding tile, and health states
- [ ] 8.2 Run all gates green: `dotnet build` (warnaserror) · `dotnet format --verify-no-changes` ·
  `dotnet test`; `nx run-many -t typecheck lint test build` · `pnpm format:check` — read output
- [ ] 8.3 Tick the OpenSpec tasks, request review, then archive the change
