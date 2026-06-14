## Context

A read-only aggregation plugin in the `iot`/`search` mold, with one new concern: parsing both RSS 2.0
and Atom robustly. Its parser is the reusable core that `goodreads` (shelf RSS) builds on.

## Goals / Non-Goals

**Goals:** fetch + parse configured feeds, aggregate newest-first, a `/rss` page + `rss-latest` tile,
skip-bad-feeds resilience.

**Non-Goals:** UI feed management, read/unread state, article view, OPML, images, pagination.

## Decisions

- **Parse with `System.ServiceModel.Syndication`** (`SyndicationFeed.Load(XmlReader)`) — the
  maintained Microsoft library that handles **both RSS 2.0 and Atom**, far more robust than
  hand-rolling two formats. One dependency on `rss.api`. Map `SyndicationItem` →
  `{ Title, Link (first link), Published (PublishDate ?? LastUpdatedTime), Source (feed title) }`.
- **`RssClient : IFeedClient`** over a named `HttpClient` + `RssOptions{Feeds[],MaxItems=30}`.
  `GetItemsAsync()` fetches each feed concurrently, parses, and **per-feed try/catch** — a bad feed is
  logged and skipped. Aggregate, sort by `Published` desc, take `MaxItems`. Abstracted for lazy
  `Resolve<T>()` + test fakes.
- **Degradation.** No feeds configured, or **every** feed failed (zero items + at least one error) →
  the endpoint maps to `502`; a partial success returns what parsed. (The endpoint distinguishes
  "client threw" from "empty but ok" — the client throws only when it can't produce anything.)
- **Web mirrors `search`/`iot`**: a `getRss` loader server fn feeds the `/rss` route + `rss-latest`
  tile (presentational).

## Risks / Trade-offs

- **Feed format quirks** (malformed XML, missing dates, relative links) → `SyndicationFeed` is
  lenient; default missing dates to `DateTimeOffset.MinValue` (sorts last) and take the first link.
  Unit-test against an RSS sample and an Atom sample.
- **Outbound to arbitrary feed URLs** → bounded by config (no user-supplied URLs in v1); per-feed
  timeout on the `HttpClient`; skip-on-error keeps one slow/dead feed from failing the whole call.
- **Shared parser vs `goodreads`** → kept as separate plugins for now (per the user's request); a
  `libs/feeds` extraction is the obvious step if a third feed-based plugin appears.
