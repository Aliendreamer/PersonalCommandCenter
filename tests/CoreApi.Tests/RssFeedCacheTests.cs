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
