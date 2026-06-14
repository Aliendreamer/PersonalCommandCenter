## Why

Surface your reading — "currently reading" / a shelf — on the command center. The official Goodreads
API was **retired by Amazon (2020)**, so the only viable path is Goodreads' still-working **per-shelf
RSS feeds**. It's a thin read-only specialization of the `rss` feed-parsing pattern.

## What Changes

- New **`goodreads` plugin** (`plugins/goodreads/goodreads.api`, id `goodreads`; manifest nav
  "Reading", `routeBase` `/goodreads`, widget `goodreads-reading`). FastEndpoints `GET /api/goodreads`:
  fetch the configured user's shelf RSS (`goodreads.com/review/list_rss/{UserId}?shelf={Shelf}`),
  parse it, and return the books mapped to `{ title, author?, link, coverUrl? }`. An
  `IGoodreadsClient` + `GoodreadsClient` (named `HttpClient`) reusing the syndication-parsing approach
  from `rss`; degrade to `502`. Registered in the three compile-time places + Dockerfile; endpoints
  require auth; lazy `Resolve<T>()`.
- Config `Plugins:Goodreads:{Enabled,UserId,Shelf}` (default shelf `currently-reading`).
- `@pcc/contracts`: a `Book` type + a `getGoodreads()` client method.
- **Web (SSR-BFF, read-only)**: `lib/server` `loadGoodreads` + `getGoodreads` server fn; a
  `/goodreads` route (SSR loader) listing the shelf's books (cover + title + author); a
  `goodreads-reading` dashboard tile (what you're currently reading). No write path.

## Capabilities

### New Capabilities

- `goodreads`: read-only Goodreads shelf via RSS — the `api/goodreads` endpoint, the shelf-RSS client
  + book mapping (Goodreads custom RSS elements: author, cover image), config-driven activation,
  graceful degradation, and the "Reading" nav/page/`goodreads-reading` tile.

### Modified Capabilities

<!-- None. -->

## Impact

- **Infra**: no new container — core-api gains `Plugins:Goodreads:*` config + a named `HttpClient`
  (outbound to `goodreads.com`).
- **Backend**: new `plugins/goodreads/goodreads.api` project (+ the same syndication-parsing
  dependency as `rss`) + 3 registration points + Dockerfile copy.
- **Contracts/Web**: `@pcc/contracts` gains `Book`; new `_authenticated/goodreads` route, a tile, and
  a server function.
- **Tests**: shelf-RSS parse/mapping unit tests (Goodreads custom elements), `api/goodreads`
  integration tests, contracts client tests, web loader/tile tests, and a live E2E.

## Non-Goals (v1)

Shelf selection from the UI (shelf is config), writing to Goodreads (impossible without the dead
API), ratings/reviews/progress, multiple users, and search. Read-only shelf display.
