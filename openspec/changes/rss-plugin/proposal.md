## Why

A generic **RSS/Atom feed reader** gives the command center a "latest from my feeds" surface, and
its feed-parsing machinery is **reusable** — `goodreads` is literally a special case (Goodreads only
exposes shelf RSS now). Read-only, no new container.

## What Changes

- New **`rss` plugin** (`plugins/rss/rss.api`, id `rss`; manifest nav "Feeds", `routeBase` `/rss`,
  widget `rss-latest`). FastEndpoints `GET /api/rss`: fetch the configured feed URLs, parse RSS/Atom,
  aggregate the newest items across feeds, and return `{ title, link, published, source }[]`. An
  `IFeedClient` + `RssClient` (named `HttpClient`); a bad/unreachable single feed is skipped, but an
  empty/unconfigured feed set or a total failure degrades to `502`. Registered in the three
  compile-time places + Dockerfile; endpoints require auth; lazy `Resolve<T>()`.
- Config `Plugins:Rss:{Enabled,Feeds[],MaxItems}` — a configured list of feed URLs.
- `@pcc/contracts`: an `RssItem` type + a `getRss()` client method.
- **Web (SSR-BFF, read-only)**: `lib/server` `loadRss` + `getRss` server fn; a `/rss` route (SSR
  loader) listing recent items newest-first; an `rss-latest` dashboard tile (the latest headline /
  item count). No write path.

## Capabilities

### New Capabilities

- `rss`: read-only RSS/Atom feed aggregation — the `api/rss` endpoint, feed fetching + parsing +
  newest-first aggregation, config-driven activation, graceful degradation (skip bad feeds), and the
  "Feeds" nav/page/`rss-latest` tile.

### Modified Capabilities

<!-- None. -->

## Impact

- **Infra**: no new container — core-api gains `Plugins:Rss:*` config + a named `HttpClient` (outbound
  to the configured feeds).
- **Backend**: new `plugins/rss/rss.api` project (+ a syndication-parsing dependency) + 3
  registration points + Dockerfile copy.
- **Contracts/Web**: `@pcc/contracts` gains `RssItem`; new `_authenticated/rss` route, a tile, and a
  server function. The feed-parsing approach is reused by the `goodreads` plugin.
- **Tests**: feed parse/aggregate unit tests, `api/rss` integration tests, contracts client tests,
  web loader/tile tests, and a live E2E (against a known stable feed).

## Non-Goals (v1)

Per-feed UI management (add/remove feeds from the UI — feeds are config), read/unread state, full
article view, OPML import/export, images/enclosures, and pagination.
