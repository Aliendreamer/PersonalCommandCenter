# RSS Redis Cache + Hourly Refresh — Design

**Date:** 2026-06-24
**Builds on:** `2026-06-24-rss-topic-curation-design.md` (already shipped)
**Status:** Approved for planning

## Goal

Stop hitting 15 public feeds on every page load. Cache the aggregated `RssItem[]` in Redis,
refresh it proactively every hour, serve the cache (fast) on normal loads, and give the UI a
**force-refresh** button. Add **RedisInsight** to inspect the cache.

## Key discovery & decision

`AddFusionCache()` is **already registered** in `Program.cs` (FusionCache 2.6.0) but **unused** —
no `GetOrSet` calls anywhere. Rather than introduce a parallel raw `IDistributedCache`, back the
existing **FusionCache with Redis (L2)**. This is still a host-level Redis cache (the approved
intent, RedisInsight-visible) and adds **fail-safe stale-serving for free**: when feeds rate-limit
(429) the factory fails and FusionCache serves the last good cached copy instead of erroring —
exactly the resilience this feature needs. (Deviation from the "raw IDistributedCache" wording in
the Q&A, same outcome, better fit.)

## Architecture

### Host-level cache wiring (`apps/core-api/Program.cs`)
Replace the bare `builder.Services.AddFusionCache();` (line 39) with a Redis-backed configuration:

- Add packages: `Microsoft.Extensions.Caching.StackExchangeRedis`,
  `ZiggyCreatures.FusionCache.Serialization.SystemTextJson`.
- `AddStackExchangeRedisCache(o => o.Configuration = Redis:Connection)` (default
  `redis:6379,abortConnect=false` so a Redis outage never blocks startup).
- `AddFusionCache()` chained with: default entry options (`Duration = 1h`,
  `IsFailSafeEnabled = true`, `FailSafeMaxDuration = 6h`, `FactorySoftTimeout = 2s`,
  `FactoryHardTimeout = 30s`), `.WithSerializer(new FusionCacheSystemTextJsonSerializer())`,
  `.WithRegisteredDistributedCache()`.

FusionCache tolerates a down Redis (logs, runs L1-only), so Redis is never a hard dependency.

### RSS plugin
- `IFeedClient` / `RssClient` stay the **raw live fetcher** (unchanged from the curation feature).
- **`RssFeedCache`** (new, scoped): wraps `IFusionCache` + `IFeedClient`. Key `rss:items`.
  - `GetAsync()` → `cache.GetOrSetAsync("rss:items", factory = feed.GetItemsAsync)`. Serves cache
    when fresh; factory runs on miss; fail-safe serves stale if the factory throws and a prior value
    exists.
  - `RefreshAsync()` → live-fetch via `IFeedClient`, `cache.SetAsync("rss:items", items)`, return
    fresh (used by the background timer and the force-refresh path).
- **`RssRefreshService : BackgroundService`** (new): runs `RefreshAsync` once on startup, then every
  `RefreshIntervalMinutes` (default **60**) via a `PeriodicTimer`. Failures are logged, never fatal
  (last cached items remain). Registered with `AddHostedService` in `RssPlugin.Configure` → only
  runs when the plugin is enabled.
- Endpoint **`GET /api/rss?refresh=<bool>`**: `refresh=true` → `RefreshAsync`; else `GetAsync`.
  502 only if a live fetch is needed *and* fails with no cached fallback; a cached copy always serves.
- `RssOptions` gains `int RefreshIntervalMinutes = 60`.

### Frontend
- `api-loaders.ts`: `loadRssRefresh(fetch)` → `GET /api/rss?refresh=true`.
- `api.ts`: `refreshRss = createServerFn({ method: 'POST' }).handler(() => loadRssRefresh(serverFetch()))`.
- New presentational **`RssRefreshButton`** (`{ onRefresh, loading }`) — Mantine `Button`,
  `variant="default"`, `size="xs"`, `loading` state. Unit-tested in isolation.
- `routes/_authenticated/rss.tsx`: render `RssRefreshButton` in `PluginPage`'s `actions`; click →
  `await refreshRss(); await router.invalidate()` (re-runs the loader → fresh cached items). The
  normal loader still calls cached `getRss()`.

### Infra (docker-compose + Traefik)
- **Redis** — unchanged (already `--appendonly yes` + `redis-data:/data`; cache survives restarts).
- **RedisInsight** — new internal service `redis/redisinsight:latest` (container port **5540**),
  **named volume `redisinsight-data:/data`** so the added Redis connection persists across restarts
  (the user's "don't re-add the server each time"). Router-only, no host port, no Keycloak —
  mirrors `pgadmin`. Traefik file-provider router + service for `redisinsight.pcc.localhost` → port
  5540. Add `redisinsight-data` to the `volumes:` block. Optionally note the endpoint in
  `DOCKER_SETUP.md`.

### Config layering
- `appsettings.json`: top-level `"Redis": { "Connection": "redis:6379,abortConnect=false" }` and
  `Plugins:Rss:RefreshIntervalMinutes: 60`.
- `appsettings.Development.json`: `"Redis": { "Connection": "localhost:6379,abortConnect=false" }`
  (host-dev reaches the published Redis on localhost). No secrets, so no `.env`.

## Testing (TDD)

- `RssFeedCacheTests` — using an in-memory `new FusionCache(new FusionCacheOptions())`:
  `GetAsync` populates from the feed on miss and serves cache on the 2nd call (feed called once);
  `RefreshAsync` overwrites with a fresh fetch.
- `RssRefreshServiceTests` — the refresh path writes to the cache (assert via the cache/feed double).
- `RssEndpointTests` — keep the existing four (still green behind the cache); add `refresh=true`
  forces a fetch.
- FE — `RssRefreshButton` renders and invokes `onRefresh`, shows `loading`.
- E2E — Refresh button visible/clickable on `/rss`; degraded tolerance preserved.

## Scope guardrails (YAGNI)

- One global cache key `rss:items` (feeds are global, not per-user).
- Host Redis wiring is reusable, but no other plugin is cached yet.
- No cache-clear UI beyond force-refresh; no per-feed cache; no cache metrics dashboard.
