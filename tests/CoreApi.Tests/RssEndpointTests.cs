using System.Net;
using System.Net.Http.Json;
using CoreApi.Tests.Auth;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Pcc.Plugins.Rss;

namespace CoreApi.Tests;

public class RssEndpointTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory = factory;

    [Fact]
    public async Task Returns_aggregated_items()
    {
        var client = AuthedWith(new FakeFeed([
            new RssItem("First", "https://e.test/1", DateTimeOffset.UtcNow, "Example"),
        ]));

        var items = await client.GetFromJsonAsync<List<ItemDto>>("/api/rss");

        Assert.NotNull(items);
        Assert.Contains(items!, i => i.Title == "First");
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

    private HttpClient AuthedWith(IFeedClient feed)
    {
        var client = _factory.Authed(s => s.AddSingleton(feed)).CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.Header, "1");
        return client;
    }

    private sealed record ItemDto(string Title, string Link, string Source);

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
}
