## Context

`GET /api/coding` calls Wakapi `summaries?range=week` and returns week total + today + per-day totals +
range-aggregated projects/languages. Wakapi's summaries response for any `range` (`week`/`month`/
`year`) is a `data[]` array where **each day** carries its own `grand_total`, `projects[]`,
`languages[]`; `cumulative_total.seconds` is the range total. So per-day breakdowns and other ranges
are already available from the same call. The `/search?q=` route shows the established pattern for a
server-refetching search param (`validateSearch` + `loaderDeps`).

## Goals / Non-Goals

**Goals:**
- Switch range (week/month/year) → server refetch.
- Click a day → filter the projects/languages breakdown to that day, instantly (no refetch).
- One per-day visualization (clickable bar chart) that scales 7 → ~170 bars.
- Bounded payload despite embedding per-day breakdowns.

**Non-Goals:**
- No language→project cross-tabulation (Wakapi doesn't provide it).
- No editors/OS/machines breakdowns (out of scope).
- No new charting dependency — bars are hand-rolled.

## Decisions

**1. `range` is a server-refetching search param.** `/coding?range=week|month|year` via `validateSearch`
(default `week`, invalid normalized to `week`) + `loaderDeps({range})`; the loader calls
`getCoding({range})`. Mirrors `/search?q=`. The endpoint validates `range` server-side too (default
`week`).

**2. Embed per-day breakdowns; filter days client-side.** The backend already has each day's
projects/languages from Wakapi, so `CodingDay` carries `Projects`/`Languages`. Clicking a bar sets
local `selectedDate` and the view renders that day's lists; no refetch. Payload is bounded by capping
per-day and aggregate lists to a top-N (per-day **8**, aggregate **15**). Alternative (refetch per day)
adds endpoint+round-trips for no real benefit since the data is already fetched.

**3. Contract rename `weekSeconds` → `totalSeconds` + add `range`.** The headline is the range total,
not always a week. `CodingDay` gains `projects`/`languages`. The tile reads `totalSeconds` and, since
it always uses the default week range, keeps its "this week" label.

```
CodingStatus { range: 'week'|'month'|'year'; totalSeconds; todaySeconds;
               days: CodingDay[]; projects: CodingBucket[]; languages: CodingBucket[] }
CodingDay    { date; seconds; projects: CodingBucket[]; languages: CodingBucket[] }
```

**4. Clickable bar chart (hand-rolled).** A flex row of `UnstyledButton` bars, height ∝ `seconds`
(min height for hit area), each with a Mantine `Tooltip` (date + duration). Selected bar uses the sky
accent; a "Whole <range>" control (or re-clicking the bar) clears the selection. Works for any bar
count; very thin bars for year are acceptable as a sparkline-style strip.

**5. `range` query on the endpoint.** `GetCodingEndpoint` becomes `Endpoint<CodingRequest,
CodingStatus>` with `CodingRequest { string? Range }` bound from the query; unknown/empty → `week`.
`CodingClient.GetStatusAsync(string range, ct)` builds `…/summaries?range={range}`.

## Risks / Trade-offs

- **Year payload size (≈170 days × top-8 breakdowns)** → cap per-day to top 8 and aggregate to top 15;
  resulting JSON is tens of KB, fine for a dashboard. Revisit only if it proves heavy.
- **Many thin bars (year)** → bars share available width via flex; a min-width keeps them clickable;
  the tooltip carries the exact date/value. Acceptable for v1.
- **Field rename ripples** → `weekSeconds`→`totalSeconds` touches the tile + tests; grep first, update
  together.
- **Selected day persistence across range change** → clearing `selectedDate` when `range` changes
  avoids a stale day not present in the new range.

## Migration Plan

1. `CodingClient` range arg + per-day breakdowns + caps (TDD).
2. `GetCodingEndpoint` range query (TDD).
3. Contracts (`CodingStatus`/`CodingDay`, `getCoding(range)`) + tile rename.
4. `/coding` route range search param; `CodingView` range tabs + bar chart + day filtering.
5. Gates green + E2E (switch range, click a day) + visual check.

Rollback = revert; no persisted state.

## Open Questions

- None.
