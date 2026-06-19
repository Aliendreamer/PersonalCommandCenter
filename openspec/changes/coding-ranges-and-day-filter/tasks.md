## 1. Backend client (TDD)

- [x] 1.1 Update `CodingClientTests`: `GetStatusAsync("month")` hits `…/summaries?range=month`; parses
  `range`, `totalSeconds` (cumulative), per-day `{date, seconds, projects, languages}`, aggregate
  projects/languages; caps per-day top-8 / aggregate top-15 — watch fail
- [x] 1.2 Update `CodingStatus`/`CodingDay` records (`Range`, `TotalSeconds`, per-day `Projects`/
  `Languages`) and `CodingClient.GetStatusAsync(string range, …)` until green

## 2. Backend endpoint (TDD)

- [x] 2.1 Update `CodingEndpointTests`: `GET /api/coding?range=month` → 200 with range `month`; no/invalid
  range → `week`; auth + disabled still hold — watch fail
- [x] 2.2 Make `GetCodingEndpoint` an `Endpoint<CodingRequest, CodingStatus>` reading the `range` query
  (validate ∈ {week,month,year}, default week); pass it to the client until green

## 3. Contracts + tile

- [x] 3.1 Update `@pcc/contracts` `CodingStatus`/`CodingDay` (range, totalSeconds, per-day breakdowns)
  and `getCoding(range)` client method (+ its test)
- [x] 3.2 `getCoding` server fn + loader take a `range`
- [x] 3.3 Update `coding-status-tile.tsx` + its test to read `totalSeconds`

## 4. Coding page (TDD)

- [x] 4.1 `routes/_authenticated/coding.tsx`: `validateSearch`/`loaderDeps` on `range` (default week),
  loader calls `getCoding({ range })`
- [x] 4.2 Update `coding-view.test.tsx`: renders a range control; renders clickable day bars; clicking
  a day filters projects/languages to that day; clearing restores the range — watch fail
- [x] 4.3 Implement `coding-view.tsx`: range `SegmentedControl` (navigates the `range` search param),
  a hand-rolled clickable bar chart (Tooltip per bar), `selectedDate` state filtering the tiles +
  table, a "whole range" clear; reset `selectedDate` on range change — until green

## 5. Verify

- [x] 5.1 Gates green: `dotnet build/format/test`; `nx typecheck lint test build` (web+contracts) ·
  `prettier --check .`
- [x] 5.2 Rebuild core-api + web; visually confirm range tabs reload and a bar click filters the breakdown
- [x] 5.3 E2E: on `/coding`, switch to Month and click a day
- [x] 5.4 Archive the change
