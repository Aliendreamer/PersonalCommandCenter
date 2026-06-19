## Why

The coding page shows only a fixed week, and the per-day chips are inert. Users want to switch the
range (week / month / year) and click a day to see that day's breakdown. Wakapi already returns a
per-day array with each day's own projects/languages for any range, so this is a presentation + light
contract change with no new data source.

## What Changes

- **`GET /api/coding` accepts a `range` query param** (`week` | `month` | `year`, default `week`),
  mapped to Wakapi `summaries?range=…`.
- **`CodingStatus` gains per-day breakdowns + a range:** each `CodingDay` carries its own `projects`
  and `languages`; the record gains `range`; `weekSeconds` is renamed **`totalSeconds`** (no longer
  always a week). Per-day and aggregate breakdown lists are capped at a top-N to bound payload size.
- **The `/coding` page gains a range tab control** (Week · Month · Year) wired to a `range` search
  param (server refetch), and a **clickable per-day bar chart** that filters the Projects tiles +
  Languages table to a selected day client-side (from the embedded per-day data — no refetch); the
  total + heading follow the range.
- **The dashboard coding tile** keeps its behavior (default week) — just the `weekSeconds` →
  `totalSeconds` field rename.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `coding`: the endpoint accepts a range and returns per-day breakdowns; the page adds range selection
  and clickable per-day filtering of the projects/languages breakdowns.

## Impact

- **.NET**: `CodingClient.GetStatusAsync(range, …)` + the `summaries?range=` URL; `CodingStatus` /
  `CodingDay` shape (per-day breakdowns, `Range`, `TotalSeconds`); `GetCodingEndpoint` reads a `range`
  query param (validated, default `week`); top-N caps.
- **Contracts**: `CodingStatus`/`CodingDay` TS types; `getCoding(range)` client + server fn.
- **Web**: `routes/_authenticated/coding.tsx` (`validateSearch`/`loaderDeps` on `range`),
  `components/coding-view.tsx` (range `SegmentedControl` + clickable bar chart + day-filtered
  breakdowns), `components/coding-status-tile.tsx` (`totalSeconds`).
- **Tests**: `CodingClient`/endpoint (range + per-day), contracts client, `coding-view` (tabs + bar
  click filtering), tile rename; an E2E (switch range, click a day). No infra changes.
