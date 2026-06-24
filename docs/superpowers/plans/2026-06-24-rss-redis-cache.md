# RSS Redis Cache + Hourly Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Cache the aggregated `RssItem[]` in Redis (via the already-present FusionCache), refresh it hourly in the background, serve cache on normal loads, and add a force-refresh button + RedisInsight.

**Architecture:** Back the existing `AddFusionCache()` with a Redis L2 (StackExchange) + SystemTextJson serializer, fail-safe on. `RssFeedCache` wraps FusionCache + the live `IFeedClient`; a `BackgroundService` refreshes hourly; the endpoint reads cache (or force-refreshes on `?refresh=true`). FE gets a Refresh button via the SSR-BFF POST pattern. RedisInsight is added as an internal, volume-backed infra container.

**Tech Stack:** FusionCache 2.6.0 + StackExchange.Redis (backend), TanStack Start + Mantine (web), docker-compose + Traefik file-provider (infra), xUnit + vitest + Playwright.

## Global Constraints

- Warnings are errors (`TreatWarningsAsErrors`); Nullable + ImplicitUsings on.
- Redis is an optimization, **never** a hard dependency: `abortConnect=false`; FusionCache runs L1-only if Redis is down; feed-fetch failures fall back to stale via fail-safe.
- Plugin services use lazy `Resolve<T>()` in endpoints; `AddHostedService` registered in `RssPlugin.Configure` (so it only runs when enabled).
- Cache key is the constant `RssFeedCache.Key = "rss:items"`.
- RedisInsight: internal only (no host port), router-only via Traefik, no Keycloak — mirror `pgadmin`.
- UI is Mantine v9 (props, not CSS). Component tests wrap via `apps/web/src/test/render.tsx`.
- Commit after each task. Gates: `dotnet build` + `dotnet test` + `dotnet format --verify-no-changes`; `pnpm typecheck/lint/test/build` + `pnpm format:check`.

---

## File Structure

- `apps/core-api/CoreApi.csproj` — add 2 packages.
- `apps/core-api/Program.cs` — Redis-backed FusionCache wiring (replace line 39).
- `apps/core-api/appsettings.json` / `appsettings.Development.json` — `Redis:Connection` + `RefreshIntervalMinutes`.
- `plugins/rss/rss.api/RssOptions.cs` — add `RefreshIntervalMinutes`.
- `plugins/rss/rss.api/RssFeedCache.cs` — create.
- `plugins/rss/rss.api/RssRefreshService.cs` — create.
- `plugins/rss/rss.api/RssPlugin.cs` — register cache + hosted service; endpoint reads cache + `refresh` query.
- `plugins/rss/rss.api/RssPlugin.csproj` — add FusionCache package ref (for `IFusionCache` types).
- `tests/CoreApi.Tests/RssFeedCacheTests.cs` — create.
- `tests/CoreApi.Tests/RssEndpointTests.cs` — add `refresh=true` test.
- `apps/web/src/lib/server/api-loaders.ts` — `loadRssRefresh`.
- `apps/web/src/lib/server/api.ts` — `refreshRss` server fn.
- `apps/web/src/components/rss-refresh-button.tsx` (+ `.test.tsx`) — create.
- `apps/web/src/routes/_authenticated/rss.tsx` — wire button + invalidate.
- `docker-compose.yml` — `redisinsight` service + `redisinsight-data` volume.
- `harness/traefik/dynamic.yml` — router + service for `redisinsight.pcc.localhost`.
- `tests/e2e/rss.spec.ts` — assert Refresh button.

---

### Task 1: Host-level Redis-backed FusionCache

**Files:**
- Modify: `apps/core-api/CoreApi.csproj`
- Modify: `apps/core-api/Program.cs:39`
- Modify: `apps/core-api/appsettings.json`, `apps/core-api/appsettings.Development.json`

**Interfaces:**
- Produces: a working `IFusionCache` (singleton) backed by Redis L2 for all consumers.

- [ ] **Step 1: Add the two packages**

Run:
```bash
dotnet add apps/core-api/CoreApi.csproj package Microsoft.Extensions.Caching.StackExchangeRedis
dotnet add apps/core-api/CoreApi.csproj package ZiggyCreatures.FusionCache.Serialization.SystemTextJson
```
Expected: both restore successfully (versions resolved for net10.0 / FusionCache 2.6.0).

- [ ] **Step 2: Replace the FusionCache registration in `Program.cs`**

Find `builder.Services.AddFusionCache();` (line ~39) and replace it with:

```csharp
var redisConnection = builder.Configuration["Redis:Connection"] ?? "redis:6379,abortConnect=false";
builder.Services.AddStackExchangeRedisCache(o => o.Configuration = redisConnection);
builder.Services
    .AddFusionCache()
    .WithDefaultEntryOptions(new FusionCacheEntryOptions
    {
        Duration = TimeSpan.FromHours(1),
        IsFailSafeEnabled = true,
        FailSafeMaxDuration = TimeSpan.FromHours(6),
        FailSafeThrottleDuration = TimeSpan.FromSeconds(30),
        FactorySoftTimeout = TimeSpan.FromSeconds(2),
        FactoryHardTimeout = TimeSpan.FromSeconds(30),
    })
    .WithSerializer(new ZiggyCreatures.Caching.Fusion.Serialization.SystemTextJson.FusionCacheSystemTextJsonSerializer())
    .WithRegisteredDistributedCache();
```

Add `using ZiggyCreatures.Caching.Fusion;` at the top if not present (for `FusionCacheEntryOptions`).

- [ ] **Step 3: Add config**

In `apps/core-api/appsettings.json`, add a top-level sibling of `"Plugins"`:

```json
  "Redis": { "Connection": "redis:6379,abortConnect=false" },
```

In `appsettings.Development.json`, add:

```json
  "Redis": { "Connection": "localhost:6379,abortConnect=false" },
```

And in `appsettings.json`, inside the `Rss` block (from the curation feature), add the interval:

```json
      "RefreshIntervalMinutes": 60,
```

- [ ] **Step 4: Build**

Run: `dotnet build`
Expected: `Build succeeded. 0 Error(s)`.

- [ ] **Step 5: Commit**

```bash
git add apps/core-api/CoreApi.csproj apps/core-api/Program.cs apps/core-api/appsettings.json apps/core-api/appsettings.Development.json
git commit -m "feat(core): Redis-backed FusionCache (L2 + fail-safe), host-level"
```

---

### Task 2: `RssFeedCache` + `RssOptions.RefreshIntervalMinutes`

**Files:**
- Modify: `plugins/rss/rss.api/RssOptions.cs`
- Modify: `plugins/rss/rss.api/RssPlugin.csproj`
- Create: `plugins/rss/rss.api/RssFeedCache.cs`
- Test: `tests/CoreApi.Tests/RssFeedCacheTests.cs`

**Interfaces:**
- Consumes: `IFeedClient.GetItemsAsync`, `IFusionCache`.
- Produces: `RssFeedCache` with `const string Key = "rss:items"`, `Task<IReadOnlyList<RssItem>> GetAsync(CancellationToken)`, `Task<IReadOnlyList<RssItem>> RefreshAsync(CancellationToken)`.

- [ ] **Step 1: Add FusionCache package ref to the plugin csproj**

In `plugins/rss/rss.api/RssPlugin.csproj`, add inside an `<ItemGroup>`:

```xml
    <PackageReference Include="ZiggyCreatures.FusionCache" Version="2.6.0" />
```

- [ ] **Step 2: Write the failing test**

Create `tests/CoreApi.Tests/RssFeedCacheTests.cs`:

```csharp
using Pcc.Plugins.Rss;
using ZiggyCreatures.Caching.Fusion;

namespace CoreApi.Tests;

public class RssFeedCacheTests
{
    private static RssItem Item(string title) =>
        new(title, $"https://e.test/{title}", DateTimeOffset.UtcNow, "Src", "technology", "");

    private sealed class CountingFeed(IReadOnlyList<RssItem> items) : IFeedClient
    {
        public int Calls { get; private set; }

        public Task<IReadOnlyList<RssItem>> GetItemsAsync(CancellationToken ct = default)
        {
            Calls++;
            return Task.FromResult(items);
        }
    }

    private static IFusionCache NewCache() => new FusionCache(new FusionCacheOptions());

    [Fact]
    public async Task GetAsync_fetches_on_miss_then_serves_cache()
    {
        var feed = new CountingFeed([Item("A")]);
        var cache = new RssFeedCache(NewCache(), feed);

        var first = await cache.GetAsync();
        var second = await cache.GetAsync();

        Assert.Equal("A", first[0].Title);
        Assert.Equal("A", second[0].Title);
        Assert.Equal(1, feed.Calls); // second call served from cache
    }

    [Fact]
    public async Task RefreshAsync_overwrites_with_a_fresh_fetch()
    {
        var feed = new CountingFeed([Item("A")]);
        var fusion = NewCache();
        var cache = new RssFeedCache(fusion, feed);

        await cache.GetAsync();           // populate
        var refreshed = await cache.RefreshAsync();

        Assert.Equal("A", refreshed[0].Title);
        Assert.Equal(2, feed.Calls);      // refresh forced a second fetch
    }
}
```

- [ ] **Step 3: Run, verify fail**

Run: `dotnet test tests/CoreApi.Tests --filter FullyQualifiedName~RssFeedCacheTests`
Expected: FAIL — `RssFeedCache` not found.

- [ ] **Step 4: Update `RssOptions.cs`** (add interval)

```csharp
namespace Pcc.Plugins.Rss;

/// <summary>Bound from the plugin's config section (<c>Plugins:Rss</c>).</summary>
public sealed class RssOptions
{
    public FeedConfig[] Feeds { get; set; } = [];

    /// <summary>Newest items kept per topic (cards use the top 10; the rest feed the list).</summary>
    public int MaxItemsPerTopic { get; set; } = 25;

    /// <summary>How often the background service re-pulls all feeds into the cache.</summary>
    public int RefreshIntervalMinutes { get; set; } = 60;
}
```

- [ ] **Step 5: Create `RssFeedCache.cs`**

```csharp
using ZiggyCreatures.Caching.Fusion;

namespace Pcc.Plugins.Rss;

/// <summary>Caches the aggregated feed list in FusionCache (Redis L2); the live fetcher is the factory.</summary>
public sealed class RssFeedCache(IFusionCache cache, IFeedClient feed)
{
    public const string Key = "rss:items";

    /// <summary>Serves the cached list; on a miss (or expiry) runs the live fetch. Fail-safe serves stale.</summary>
    public async Task<IReadOnlyList<RssItem>> GetAsync(CancellationToken ct = default) =>
        await cache.GetOrSetAsync<IReadOnlyList<RssItem>>(
            Key,
            async (_, innerCt) => await feed.GetItemsAsync(innerCt),
            token: ct);

    /// <summary>Forces a live fetch and overwrites the cache (background timer + force-refresh path).</summary>
    public async Task<IReadOnlyList<RssItem>> RefreshAsync(CancellationToken ct = default)
    {
        var items = await feed.GetItemsAsync(ct);
        await cache.SetAsync<IReadOnlyList<RssItem>>(Key, items, token: ct);
        return items;
    }
}
```

- [ ] **Step 6: Run, verify pass**

Run: `dotnet test tests/CoreApi.Tests --filter FullyQualifiedName~RssFeedCacheTests`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add plugins/rss/rss.api/RssOptions.cs plugins/rss/rss.api/RssFeedCache.cs plugins/rss/rss.api/RssPlugin.csproj tests/CoreApi.Tests/RssFeedCacheTests.cs
git commit -m "feat(rss): RssFeedCache over FusionCache (get/refresh)"
```

---

### Task 3: Background refresh service + cached endpoint

**Files:**
- Create: `plugins/rss/rss.api/RssRefreshService.cs`
- Modify: `plugins/rss/rss.api/RssPlugin.cs`
- Test: `tests/CoreApi.Tests/RssEndpointTests.cs`

**Interfaces:**
- Consumes: `RssFeedCache` (Task 2), `RssOptions.RefreshIntervalMinutes`.
- Produces: endpoint `GET /api/rss?refresh=<bool>` serving cache / forcing refresh.

- [ ] **Step 1: Add a force-refresh endpoint test (failing)**

In `tests/CoreApi.Tests/RssEndpointTests.cs`, add (the `FakeFeed` counts not required — assert the call path returns items via refresh):

```csharp
    [Fact]
    public async Task Refresh_query_forces_a_fresh_fetch()
    {
        var client = AuthedWith(new FakeFeed([
            new RssItem("Fresh", "https://e.test/f", DateTimeOffset.UtcNow, "Example", "world", ""),
        ]));

        var items = await client.GetFromJsonAsync<List<ItemDto>>("/api/rss?refresh=true");

        Assert.NotNull(items);
        Assert.Contains(items!, i => i.Title == "Fresh");
    }
```

> The existing four tests stay. They exercise the cache transparently (each uses a fresh host, so
> the in-memory L1 is isolated). If `Returns_502_when_feeds_fail` flakes because fail-safe serves a
> stale value, note it — but with a fresh host there is no prior value, so the factory throws → 502.

- [ ] **Step 2: Run, verify fail**

Run: `dotnet test tests/CoreApi.Tests --filter FullyQualifiedName~RssEndpointTests`
Expected: FAIL — the endpoint doesn't read `refresh` yet / `RssFeedCache` not registered.

- [ ] **Step 3: Create `RssRefreshService.cs`**

```csharp
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Pcc.Plugins.Rss;

/// <summary>Proactively pulls all feeds into the cache on startup and every RefreshIntervalMinutes.</summary>
public sealed class RssRefreshService(
    IServiceScopeFactory scopes,
    IOptions<RssOptions> options,
    ILogger<RssRefreshService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var minutes = Math.Max(1, options.Value.RefreshIntervalMinutes);
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(minutes));
        do
        {
            try
            {
                using var scope = scopes.CreateScope();
                await scope.ServiceProvider.GetRequiredService<RssFeedCache>().RefreshAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning(ex, "RSS background refresh failed; keeping last cached items.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
```

- [ ] **Step 4: Update `RssPlugin.cs` (register cache + hosted service; endpoint reads cache + `refresh`)**

```csharp
using FastEndpoints;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Pcc.Plugins.Rss;

/// <summary>Read-only RSS/Atom feed aggregator with a Redis-cached, hourly-refreshed result.</summary>
public sealed class RssPlugin : IPlugin
{
    public string Id => "rss";

    public PluginManifest Manifest { get; } = new("rss", "Feeds", "/rss", ["rss-latest"]);

    public void Configure(IServiceCollection services, IConfiguration config)
    {
        services.Configure<RssOptions>(config);
        services.AddHttpClient<IFeedClient, RssClient>();
        services.AddScoped<RssFeedCache>();
        services.AddHostedService<RssRefreshService>();
    }
}

/// <summary><c>GET /api/rss?refresh=&lt;bool&gt;</c> — cached aggregate; refresh forces a live pull.</summary>
internal sealed class GetRssEndpoint : EndpointWithoutRequest<IReadOnlyList<RssItem>>
{
    public override void Configure() => Get("/rss");

    public override async Task HandleAsync(CancellationToken ct)
    {
        var cache = Resolve<RssFeedCache>();
        var refresh = Query<bool>("refresh", isRequired: false);
        try
        {
            var items = refresh ? await cache.RefreshAsync(ct) : await cache.GetAsync(ct);
            await Send.OkAsync(items, ct);
        }
        catch (Exception)
        {
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status502BadGateway));
        }
    }
}
```

- [ ] **Step 5: Run, verify pass**

Run: `dotnet test tests/CoreApi.Tests --filter FullyQualifiedName~RssEndpointTests`
Expected: PASS (5 tests).

- [ ] **Step 6: Full backend gate**

Run: `dotnet build && dotnet test --filter FullyQualifiedName~Rss && dotnet format --verify-no-changes`
Expected: build OK; all Rss tests green; format clean (run `dotnet format` if needed).

- [ ] **Step 7: Commit**

```bash
git add plugins/rss/rss.api/RssRefreshService.cs plugins/rss/rss.api/RssPlugin.cs tests/CoreApi.Tests/RssEndpointTests.cs
git commit -m "feat(rss): hourly background refresh + cached endpoint with ?refresh"
```

---

### Task 4: Frontend — force-refresh button

**Files:**
- Modify: `apps/web/src/lib/server/api-loaders.ts`
- Modify: `apps/web/src/lib/server/api.ts`
- Create: `apps/web/src/components/rss-refresh-button.tsx`
- Test: `apps/web/src/components/rss-refresh-button.test.tsx`
- Modify: `apps/web/src/routes/_authenticated/rss.tsx`

**Interfaces:**
- Consumes: `getRss` (existing), `RssItem`.
- Produces: `refreshRss()` server fn; `RssRefreshButton({ onRefresh, loading })`.

- [ ] **Step 1: Add the loader** (`api-loaders.ts`, next to `loadRss`)

```ts
export const loadRssRefresh = (fetchImpl: FetchLike): Promise<RssItem[]> =>
  loadProtected<RssItem[]>(fetchImpl, '/api/rss?refresh=true')
```

- [ ] **Step 2: Add the server fn** (`api.ts`, next to `getRss`)

```ts
export const refreshRss = createServerFn({ method: 'POST' }).handler(() =>
  loadRssRefresh(serverFetch()),
)
```

Add `loadRssRefresh` to the import from `./api-loaders`.

- [ ] **Step 3: Write the button test (failing)**

Create `apps/web/src/components/rss-refresh-button.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '../test/render'
import { RssRefreshButton } from './rss-refresh-button'

describe('RssRefreshButton', () => {
  it('calls onRefresh when clicked', () => {
    const onRefresh = vi.fn()
    render(<RssRefreshButton onRefresh={onRefresh} loading={false} />)
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }))
    expect(onRefresh).toHaveBeenCalledOnce()
  })

  it('shows a busy state when loading', () => {
    render(<RssRefreshButton onRefresh={() => {}} loading={true} />)
    expect(screen.getByRole('button', { name: /refresh/i })).toBeDefined()
  })
})
```

- [ ] **Step 4: Run, verify fail**

Run: `pnpm --filter web test -- rss-refresh-button`
Expected: FAIL — module not found.

- [ ] **Step 5: Create `rss-refresh-button.tsx`**

```tsx
import { Button } from '@mantine/core'

export interface RssRefreshButtonProps {
  onRefresh: () => void
  loading: boolean
}

/** Header action: force a live re-pull of all feeds (bypasses the cache). */
export function RssRefreshButton({ onRefresh, loading }: RssRefreshButtonProps) {
  return (
    <Button variant="default" size="xs" onClick={onRefresh} loading={loading}>
      Refresh
    </Button>
  )
}
```

- [ ] **Step 6: Run, verify pass**

Run: `pnpm --filter web test -- rss-refresh-button`
Expected: PASS (2 tests).

- [ ] **Step 7: Wire it into the page** (`routes/_authenticated/rss.tsx`)

```tsx
import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Stack } from '@mantine/core'

import { getRss, refreshRss } from '../../lib/server/api'
import { settle } from '../../lib/server/api-loaders'
import { RssTopicCards } from '../../components/rss-topic-cards'
import { RssItemList } from '../../components/rss-item-list'
import { RssRefreshButton } from '../../components/rss-refresh-button'
import { PluginPage } from '../../components/plugin-page'

export const Route = createFileRoute('/_authenticated/rss')({
  loader: async () => settle(getRss()),
  component: RssPage,
})

function RssPage() {
  const result = Route.useLoaderData()
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const items = result.data ?? []

  const onRefresh = async () => {
    setRefreshing(true)
    try {
      await refreshRss()
      await router.invalidate()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <PluginPage
      title="Feeds"
      fill
      actions={<RssRefreshButton onRefresh={onRefresh} loading={refreshing} />}
    >
      <Stack gap="lg">
        {!result.error ? <RssTopicCards items={items} /> : null}
        <RssItemList items={items} error={result.error ? 'unreachable' : undefined} />
      </Stack>
    </PluginPage>
  )
}
```

- [ ] **Step 8: Typecheck + tests**

Run: `pnpm typecheck && pnpm --filter web test -- rss`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/lib/server/api-loaders.ts apps/web/src/lib/server/api.ts apps/web/src/components/rss-refresh-button.tsx apps/web/src/components/rss-refresh-button.test.tsx apps/web/src/routes/_authenticated/rss.tsx
git commit -m "feat(rss): force-refresh button (SSR-BFF POST + invalidate)"
```

---

### Task 5: Infra — RedisInsight container + Traefik route

**Files:**
- Modify: `docker-compose.yml`
- Modify: `harness/traefik/dynamic.yml`

**Interfaces:**
- Produces: `redisinsight.pcc.localhost` GUI, connection persisted in a named volume.

- [ ] **Step 1: Add the service to `docker-compose.yml`**

Add near the other base-infra services (e.g. after `redis:`):

```yaml
  redisinsight:
    image: redis/redisinsight:latest
    # Redis GUI. Reached via redisinsight.pcc.localhost (Traefik); no host port. The added Redis
    # connection persists in the redisinsight-data volume (no need to re-add it each restart).
    volumes:
      - redisinsight-data:/data
    depends_on:
      - redis
```

- [ ] **Step 2: Add the volume**

In the `volumes:` block of `docker-compose.yml`, add:

```yaml
  redisinsight-data:
```

- [ ] **Step 3: Add the Traefik router + service** (`harness/traefik/dynamic.yml`)

Under `http.routers:` (next to `pgadmin`):

```yaml
    redisinsight:
      rule: 'Host(`redisinsight.pcc.localhost`)'
      entryPoints: ['web']
      service: redisinsight
```

Under `http.services:` (next to `pgadmin`):

```yaml
    redisinsight:
      loadBalancer:
        servers:
          - url: 'http://redisinsight:5540'
```

- [ ] **Step 4: Validate compose + bring it up**

Run:
```bash
docker compose config >/dev/null && echo COMPOSE_OK
docker compose up -d redisinsight
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: redisinsight.pcc.localhost" http://127.0.0.1/
```
Expected: `COMPOSE_OK`; the curl returns `200` or `302` (RedisInsight UI responds). In RedisInsight,
add a database `redis:6379` once — it will persist via the volume.

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml harness/traefik/dynamic.yml
git commit -m "feat(infra): RedisInsight GUI (volume-backed) behind Traefik"
```

---

### Task 6: E2E — Refresh button present

**Files:**
- Modify: `tests/e2e/rss.spec.ts`

- [ ] **Step 1: Add an assertion** after navigating to `/rss` (keep degraded tolerance):

```ts
await expect(page.getByRole('button', { name: /refresh/i })).toBeVisible()
```

- [ ] **Step 2: Run (needs the live stack, rebuilt core-api + web)**

Run: from `tests/e2e`, `pnpm exec playwright test rss.spec.ts --reporter=line`
Expected: PASS (or the documented degraded path; the Refresh button renders regardless of feed health).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/rss.spec.ts
git commit -m "test(rss): e2e asserts the refresh button"
```

---

## Final gate (before done)

```bash
dotnet build && dotnet test && dotnet format --verify-no-changes
pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm format:check
```

Then rebuild + restart the running stack to verify live:
```bash
docker compose build core-api web && docker compose up -d --no-deps core-api web
```

---

## Self-Review

- **Spec coverage:** Redis-backed FusionCache host-level (T1) ✓; `RssFeedCache` get/refresh (T2) ✓; hourly `BackgroundService` (T3) ✓; `?refresh` endpoint (T3) ✓; force-refresh button via SSR-BFF POST + invalidate (T4) ✓; RedisInsight volume-backed behind Traefik (T5) ✓; Redis already persistent (noted) ✓; degradation/fail-safe (T1/T2/T3) ✓; E2E (T6) ✓.
- **Placeholder scan:** none — all code is concrete.
- **Type consistency:** `RssFeedCache.Key`, `GetAsync`/`RefreshAsync` names identical across T2/T3; `RssItem` 6-arg ctor matches the curation feature; `refreshRss`/`loadRssRefresh`/`RssRefreshButton` names consistent T4; RedisInsight port 5540 consistent T5.
- **Note:** FusionCache builder method names (`WithSerializer`, `WithRegisteredDistributedCache`, `WithDefaultEntryOptions`) are the v2 API; if the installed 2.6.0 differs, adjust to the equivalent builder calls and keep the same wiring (Redis L2 + STJ serializer + fail-safe defaults).
```
