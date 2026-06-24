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
