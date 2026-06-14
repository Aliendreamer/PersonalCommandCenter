## Why

`search` is the last of the original three roadmap plugins — a quick metasearch box in the command
center. It's read-only and thin, so it closes out the set cleanly. It also self-hosts its own
**SearXNG** (the `:8888` instance belongs to a different project — PCC owns only what's in its
compose), proving the "self-host the dependency" pattern once more.

## What Changes

- Self-host a **SearXNG** service in `docker-compose` (internal on the compose network; a
  `harness/searxng/settings.yml` that enables the JSON format, disables the bot limiter for
  server-to-server queries, and sets a dev `secret_key`; an optional `searxng.pcc.localhost` Traefik
  route for its UI). core-api reaches it as `http://searxng:8080`.
- New **`search` plugin** (`plugins/search/search.api`, id `search`; manifest nav "Search",
  `routeBase` `/search`, widget `search-box`). FastEndpoints `GET /api/search?q=…`: query SearXNG
  (`{BaseUrl}/search?q=<q>&format=json`) via a `SearxngClient` (named `HttpClient`) behind
  `ISearchClient`, mapping results to `{ title, url, content?, engine? }` (top N). Blank `q` → `400`;
  SearXNG unreachable/unconfigured → `502` (the IoT degradation contract). Registered in the three
  compile-time places + Dockerfile; endpoints require auth; lazy `Resolve<T>()`.
- `@pcc/contracts`: a `SearchResult` type + a `getSearch(q)` client method.
- **Web (SSR-BFF, read-only, query-driven)**: `lib/server` `loadSearch(fetchImpl, q)` + a
  `getSearch` server fn (validator `q`); a `/search` route under `_authenticated` with a `q` **search
  param** (`loaderDeps` on `q`; the loader runs `getSearch` only when `q` is present) rendering a
  search form + a `SearchResultList` **server-side**; a `search-box` dashboard tile (a small input
  that navigates to `/search?q=`). No write path.

## Capabilities

### New Capabilities

- `search`: read-only metasearch via a self-hosted SearXNG — the `api/search` endpoint, the SearXNG
  client + result mapping, config-driven activation, graceful degradation, and the "Search"
  nav/page/`search-box` tile UI surfaces.

### Modified Capabilities

<!-- None. `web-shell` and `plugin-host` already cover plugin nav/tiles/SSR loaders + compile-time
     registration generically; `search` is a new instance. -->

## Impact

- **Infra**: new `searxng` compose service (internal + optional `searxng.pcc.localhost` route) +
  `harness/searxng/settings.yml`; core-api gains `Plugins:Search:*` config + a named SearXNG
  `HttpClient`.
- **Backend**: new `plugins/search/search.api` project + 3 registration points + Dockerfile copy.
  Read-only (no DB, no write endpoints).
- **Contracts/Web**: `@pcc/contracts` gains `SearchResult`; new `_authenticated/search` route (a
  query-param loader — the first param-driven SSR loader), a `search-box` tile, and server functions.
- **Tests**: SearXNG client/mapping unit tests, `api/search` integration tests, contracts client
  tests, web loader/tile/result-list tests, and a live E2E.

## Non-Goals (v1)

Engine selection / filters / pagination / safesearch UX, autocomplete, result caching, image/news
verticals, and any search-history persistence. SearXNG stays internal-only (no external
reachability). A thin read-only metasearch surface.
