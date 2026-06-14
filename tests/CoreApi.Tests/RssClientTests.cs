using System.Net;
using Microsoft.Extensions.Options;
using Pcc.Plugins.Rss;

namespace CoreApi.Tests;

public class RssClientTests
{
    private const string Rss = """
        <?xml version="1.0"?>
        <rss version="2.0"><channel>
          <title>Example</title>
          <item><title>First</title><link>https://e.test/1</link><pubDate>Mon, 15 Jun 2026 10:00:00 GMT</pubDate></item>
          <item><title>Second</title><link>https://e.test/2</link><pubDate>Mon, 15 Jun 2026 09:00:00 GMT</pubDate></item>
        </channel></rss>
        """;

    private const string Atom = """
        <?xml version="1.0"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <title>Atomic</title>
          <entry><title>Newest</title><link href="https://a.test/x"/><updated>2026-06-15T12:00:00Z</updated></entry>
        </feed>
        """;

    [Fact]
    public async Task Aggregates_newest_first_across_feeds()
    {
        var client = Create(new Dictionary<string, string?>
        {
            ["https://e.test/rss"] = Rss,
            ["https://a.test/atom"] = Atom,
        });

        var items = await client.GetItemsAsync();

        Assert.Equal(3, items.Count);
        Assert.Equal("Newest", items[0].Title); // 12:00 Atom is newest
        Assert.Contains(items, i => i.Source == "Example");
    }

    [Fact]
    public async Task Skips_a_bad_feed_but_keeps_the_good_one()
    {
        var client = Create(new Dictionary<string, string?>
        {
            ["https://e.test/rss"] = Rss,
            ["https://bad.test/feed"] = null, // 500 → skipped
        });

        var items = await client.GetItemsAsync();

        Assert.Equal(2, items.Count);
    }

    [Fact]
    public async Task Throws_when_no_feeds_configured()
    {
        var client = new RssClient(new HttpClient(new StubHandler([])), Options.Create(new RssOptions()));
        await Assert.ThrowsAsync<InvalidOperationException>(() => client.GetItemsAsync());
    }

    private static RssClient Create(Dictionary<string, string?> feeds)
    {
        var handler = new StubHandler(feeds);
        var options = Options.Create(new RssOptions { Feeds = [.. feeds.Keys], MaxItems = 30 });
        return new RssClient(new HttpClient(handler), options);
    }

    private sealed class StubHandler(Dictionary<string, string?> responses) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            var body = responses.TryGetValue(request.RequestUri!.AbsoluteUri, out var content) ? content : null;
            if (body is null)
            {
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.InternalServerError));
            }

            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(body, System.Text.Encoding.UTF8, "application/xml"),
            });
        }
    }
}
