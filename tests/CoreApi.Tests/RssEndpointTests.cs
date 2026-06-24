using System.Net;
using System.Net.Http.Json;
using CoreApi.Tests.Auth;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.DependencyInjection;
using Pcc.Plugins.Rss;

namespace CoreApi.Tests;

public class RssEndpointTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory = factory;

    [Fact]
    public async Task Returns_aggregated_items_with_topic_and_summary()
    {
        var client = AuthedWith(new FakeFeed([
            new RssItem("First", "https://e.test/1", DateTimeOffset.UtcNow, "Example", "technology", "A summary"),
        ]));

        var items = await client.GetFromJsonAsync<List<ItemDto>>("/api/rss");

        Assert.NotNull(items);
        var first = Assert.Single(items!);
        Assert.Equal("First", first.Title);
        Assert.Equal("technology", first.Topic);
        Assert.Equal("A summary", first.Summary);
    }

    [Fact]
    public async Task Requires_authentication()
    {
        var response = await _factory.CreateClient().GetAsync("/api/rss");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Returns_502_when_feeds_fail()
    {
        var client = AuthedWith(new ThrowingFeed());
        var response = await client.GetAsync("/api/rss");
        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
    }

    [Fact]
    public async Task Absent_when_disabled()
    {
        Environment.SetEnvironmentVariable("Plugins__Rss__Enabled", "false");
        try
        {
            await using var factory = new WebApplicationFactory<Program>();
            var client = factory.AuthedClient();

            var response = await client.GetAsync("/api/rss");
            var plugins = await client.GetFromJsonAsync<List<PluginDto>>("/api/plugins");

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
            Assert.DoesNotContain(plugins!, p => p.Id == "rss");
        }
        finally
        {
            Environment.SetEnvironmentVariable("Plugins__Rss__Enabled", null);
        }
    }

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

    private HttpClient AuthedWith(IFeedClient feed)
    {
        var client = _factory.Authed(s =>
        {
            s.AddSingleton(feed);

            // Isolate the FusionCache L2 per test host: replace the shared Redis distributed cache
            // with a do-nothing one so the constant `rss:items` key never bleeds across tests (or
            // across runs via a live Redis). FusionCache rejects a MemoryDistributedCache here
            // (WithRegisteredDistributedCache ignores it), so this is a distinct null type that
            // always misses — keeping fail-safe honest: with no stale value the factory throw
            // propagates → 502.
            foreach (var d in s.Where(d => d.ServiceType == typeof(IDistributedCache)).ToList())
            {
                s.Remove(d);
            }

            s.AddSingleton<IDistributedCache, NullDistributedCache>();
        }).CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.Header, "1");
        return client;
    }

    private sealed record ItemDto(string Title, string Link, string Source, string Topic, string Summary);

    private sealed record PluginDto(string Id);

    private sealed class FakeFeed(IReadOnlyList<RssItem> items) : IFeedClient
    {
        public Task<IReadOnlyList<RssItem>> GetItemsAsync(CancellationToken ct = default) =>
            Task.FromResult(items);
    }

    private sealed class ThrowingFeed : IFeedClient
    {
        public Task<IReadOnlyList<RssItem>> GetItemsAsync(CancellationToken ct = default) =>
            throw new InvalidOperationException("All feeds failed.");
    }

    /// <summary>An <see cref="IDistributedCache"/> that stores nothing — every read misses. Used to
    /// give each test host an isolated, empty FusionCache L2 (no shared Redis state).</summary>
    private sealed class NullDistributedCache : IDistributedCache
    {
        public byte[]? Get(string key) => null;

        public Task<byte[]?> GetAsync(string key, CancellationToken token = default) =>
            Task.FromResult<byte[]?>(null);

        public void Set(string key, byte[] value, DistributedCacheEntryOptions options) { }

        public Task SetAsync(
            string key, byte[] value, DistributedCacheEntryOptions options, CancellationToken token = default) =>
            Task.CompletedTask;

        public void Refresh(string key) { }

        public Task RefreshAsync(string key, CancellationToken token = default) => Task.CompletedTask;

        public void Remove(string key) { }

        public Task RemoveAsync(string key, CancellationToken token = default) => Task.CompletedTask;
    }
}
