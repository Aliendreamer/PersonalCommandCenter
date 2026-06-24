# RSS Topic Curation — Design

**Date:** 2026-06-24
**Plugin:** `rss`
**Status:** Approved for planning

## Goal

Turn the RSS plugin from a single flat newest-first list into a **topic-curated** experience:

- Four fixed topics: **Technology, Bulgaria, World, Sports**.
- Top section: **top 10 cards per topic**, arranged as **4 columns** (one per topic).
- Below: a **filterable list** of all items, filterable by **Topic** and **Source**.

Topic assignment is **per-feed**: each configured feed is tagged with exactly one topic, and an
item inherits its feed's topic. No keyword classification, no per-item category parsing.

## Current state (baseline)

- `plugins/rss/rss.api/RssOptions.cs` — `string[] Feeds`, `int MaxItems = 30`.
- `plugins/rss/rss.api/RssItem.cs` — `record RssItem(string Title, string Link, DateTimeOffset Published, string Source)`.
- `plugins/rss/rss.api/RssClient.cs` — fetches all feeds in parallel (buffer to `byte[]` →
  `MemoryStream` → `XmlReader` → `SyndicationFeed.Load`), flattens, sorts newest-first, takes
  `MaxItems`. One bad feed → skipped (`null`); all fail → throws → endpoint returns **502**.
- `plugins/rss/rss.api/RssPlugin.cs` — `GET /api/rss` returns `IReadOnlyList<RssItem>`.
- `libs/contracts/src/types.ts` — `RssItem { title, link, published, source }`; client `getRss()`.
- `apps/web/src/routes/_authenticated/rss.tsx` — loader `settle(getRss())`, renders `RssItemList`.
- `apps/web/src/components/rss-item-list.tsx` — flat bordered `<ul>` list.
- `apps/web/src/components/rss-latest-tile.tsx` — dashboard tile, latest headline + count.
- BFF: `apps/web/src/lib/server/api.ts` `getRss()` → `api-loaders.ts` `loadRss()`.

## Feed map (locked, 15 feeds)

| Topic | Feeds |
|---|---|
| **technology** | Hacker News (`hnrss.org/frontpage`) · Ars Technica · Hackaday (`hackaday.com/blog/feed/`) · CNN Technology (`rss.cnn.com/rss/edition_technology.rss`) |
| **bulgaria** | dnes.bg (RSS.BG / `rssnovini.dnes.bg`, http) · Novinite (`novinite.com`) · dnevnik.bg · sportal.bg |
| **world** | BBC News (`feeds.bbci.co.uk/news/rss.xml`) · The Guardian/World (`theguardian.com/world/rss`) · CNN World (`rss.cnn.com/rss/edition_world.rss`) |
| **sports** | ESPN NFL (`espn.com/espn/rss/nfl/news`) · ESPN Soccer (`espn.com/espn/rss/soccer/news`) · ESPN NBA (`espn.com/espn/rss/nba/news`) · Football365 (`football365.com/feed`) |

**Feed URLs to verify at wiring time** (could not be auto-confirmed during design):

- dnes.bg per-category exact `.xml` paths (HTTP-only; HTTPS cert mismatch — subscribe over `http://`).
- Novinite, dnevnik.bg, sportal.bg exact RSS paths.
- CNN feeds: documented active, but the design-time fetch validator threw a TLS cert error on the
  CDN. Acceptable — fetched server-to-server; skips gracefully if the cert misbehaves at runtime.
- Football365: `https://www.football365.com/feed` 404'd to the fetch tool (likely UA-blocking).
  Confirm exact path; degrades gracefully if unreachable.

Per the existing degradation contract, any single unreachable/invalid feed is skipped; only an
all-feeds-fail (or empty config) yields 502.

## Data model & topic assignment

Config moves from flat `string[]` to **topic-tagged feed objects**.

```csharp
public sealed class FeedConfig
{
    public string Url { get; set; } = "";
    public RssTopic Topic { get; set; }   // technology | bulgaria | world | sports
}

public sealed class RssOptions
{
    public FeedConfig[] Feeds { get; set; } = [];
    public int MaxItemsPerTopic { get; set; } = 25;   // replaces global MaxItems
}
```

`RssTopic` is an enum serialized as a lowercase string (match the existing
`JsonStringEnumConverter` convention used for notification severities) so it lines up with the TS
union type.

`RssItem` gains two fields:

```csharp
public sealed record RssItem(
    string Title, string Link, DateTimeOffset Published, string Source,
    RssTopic Topic, string Summary);
```

`Summary` is the feed item's `<description>`/`<summary>` with HTML stripped (reuse the HTML-strip
helper used by the Goodreads book modal; if it is not extractable into a shared spot cheaply,
duplicate the small strip routine in the rss plugin). Empty string when absent.

## Backend (`plugins/rss`)

`RssClient.GetItemsAsync`:

1. Fetch every `FeedConfig` in parallel (parsing unchanged: buffer → `MemoryStream` → `XmlReader`
   → `SyndicationFeed.Load`).
2. Tag each parsed item with its feed's `Topic` and the stripped `Summary`.
3. **Group by topic**, order each group newest-first, take `MaxItemsPerTopic` per topic. This
   guarantees a low-volume topic (Bulgaria) is never starved by a high-volume one (Technology) —
   the failure mode of a single global `Take(N)`.
4. Return the flattened result (all topics), newest-first across the whole set, as
   `IReadOnlyList<RssItem>`.

Degradation unchanged: empty config or all-feeds-fail → throw → endpoint **502**; single bad feed
skipped. Endpoint signature (`GET /api/rss` → `RssItem[]`) is unchanged; items are richer.

## Contract (`libs/contracts`)

```ts
export type RssTopic = 'technology' | 'bulgaria' | 'world' | 'sports'
export interface RssItem {
  title: string
  link: string
  published: string
  source: string
  topic: RssTopic
  summary: string
}
```

Client `getRss()` unchanged.

## Frontend (`apps/web`)

The page derives **both** the cards and the list from the **same loader payload** — filtering is
client-side, no extra fetch.

- **`rss-topic-cards.tsx`** (new): a 4-column grid (Mantine `SimpleGrid`, `cols={{ base: 1, sm: 2,
  lg: 4 }}`), one labeled column per topic in fixed order (Technology, Bulgaria, World, Sports).
  Each column renders its topic's **newest 10** items as `RssCard`s.
  - `RssCard`: title as an external `<Anchor>` (`safeHref` + `rel="noreferrer noopener"`,
    `target="_blank"`), a `source · relative-time` line, and a clamped `summary` snippet.
- **`rss-item-list.tsx`** (updated): adds filter controls above the existing list —
  - **Topic** filter: segmented chips `All / Technology / Bulgaria / World / Sports`.
  - **Source** filter: a `Select` populated from the distinct sources present in the data.
  - List shows all items matching the active filters, newest-first. Existing per-row rendering
    (anchor + `source · time`) is kept; summary optional in the row.
- **`rss.tsx` route**: loader unchanged (`settle(getRss())`); renders `RssTopicCards` then
  `RssItemList`, both fed `result.data`. Error → existing "Feeds unavailable" path.
- **`rss-latest-tile.tsx`** (dashboard): minimal change; still shows latest headline + count.
  May show the latest item's topic as a small label. No behavioral change to the dashboard loader.

Topic order is fixed in the FE (a `TOPICS` constant) so columns/chips render deterministically and
empty topics still show a labeled, empty column ("No items").

## Testing (TDD order — dev-flow)

1. `tests/CoreApi.Tests/RssClientTests.cs` — topic tagging from feed config; per-topic cap
   (`MaxItemsPerTopic`) does not starve low-volume topics; summary HTML-stripping; degradation
   (one bad feed skipped, all-fail throws).
2. `tests/CoreApi.Tests/RssEndpointTests.cs` — 200 returns topic+summary fields; 502 on all-fail.
3. `libs/contracts` — `RssItem` type + `RssTopic` union compile/typecheck.
4. Component tests — `rss-topic-cards` (renders 4 columns, ≤10 per topic, empty-topic state);
   `rss-item-list` (topic chip filtering, source-select filtering).
5. Page render test — `/rss` renders cards + filterable list from loader data.
6. E2E `tests/e2e/rss.spec.ts` — tolerant of degraded feeds (as today): assert topic columns/filter
   controls present; items-or-degraded-notice.

## Config layering

Per the project config rules, the topic-tagged feed list (non-secret) lives in
`apps/core-api/appsettings.json` under `Plugins:Rss:Feeds` as objects `{ Url, Topic }`, plus
`Plugins:Rss:MaxItemsPerTopic`. No secrets, no docker-compose entries. `appsettings.Development.json`
may override with `http://` dnes.bg if needed.

## Scope guardrails (YAGNI)

- **No** thumbnails/images on cards (rejected — image URLs flaky across feeds).
- **No** text search in the list (rejected — topic + source only).
- **No** keyword/per-item-category classification — topic is purely the feed's tag.
- **No** persistence/DB — still live-fetch each request.
- **No** new per-source config beyond `{ Url, Topic }`.
- Topics are a **fixed set of four**, not user-configurable.
