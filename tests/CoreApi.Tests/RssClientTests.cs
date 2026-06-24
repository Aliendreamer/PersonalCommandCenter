using System.Net;
using Microsoft.Extensions.Options;
using Pcc.Plugins.Rss;

namespace CoreApi.Tests;

public class RssClientTests
{
    private const string TechRss = """
        <?xml version="1.0"?>
        <rss version="2.0"><channel>
          <title>TechSite</title>
          <item><title>Tech A</title><link>https://t.test/a</link>
            <description><![CDATA[<p>Hello <b>world</b></p>]]></description>
            <pubDate>Mon, 15 Jun 2026 10:00:00 GMT</pubDate></item>
          <item><title>Tech B</title><link>https://t.test/b</link>
            <pubDate>Mon, 15 Jun 2026 09:00:00 GMT</pubDate></item>
        </channel></rss>
        """;

    private const string BgRss = """
        <?xml version="1.0"?>
        <rss version="2.0"><channel>
          <title>BgSite</title>
          <item><title>Bg Old</title><link>https://b.test/1</link>
            <pubDate>Mon, 01 Jun 2026 08:00:00 GMT</pubDate></item>
        </channel></rss>
        """;

    [Fact]
    public async Task Tags_items_with_their_feed_topic()
    {
        var client = Create(
            ("https://t.test/rss", "technology", TechRss),
            ("https://b.test/rss", "bulgaria", BgRss));

        var items = await client.GetItemsAsync();

        Assert.All(items.Where(i => i.Source == "TechSite"), i => Assert.Equal("technology", i.Topic));
        Assert.All(items.Where(i => i.Source == "BgSite"), i => Assert.Equal("bulgaria", i.Topic));
    }

    [Fact]
    public async Task Strips_html_from_summary()
    {
        var client = Create(("https://t.test/rss", "technology", TechRss));

        var items = await client.GetItemsAsync();

        var a = Assert.Single(items, i => i.Title == "Tech A");
        Assert.Equal("Hello world", a.Summary);
    }

    [Fact]
    public async Task Caps_items_per_topic()
    {
        var client = Create(maxPerTopic: 1, feeds: ("https://t.test/rss", "technology", TechRss));

        var items = await client.GetItemsAsync();

        Assert.Single(items);
        Assert.Equal("Tech A", items[0].Title); // newest kept
    }

    [Fact]
    public async Task Low_volume_topic_is_not_starved_by_a_busy_one()
    {
        // technology has 2 newer items, bulgaria has 1 older item; cap=2 → bulgaria still present.
        var client = Create(maxPerTopic: 2,
            feeds: new (string, string, string?)[]
            {
                ("https://t.test/rss", "technology", TechRss),
                ("https://b.test/rss", "bulgaria", BgRss),
            });

        var items = await client.GetItemsAsync();

        Assert.Contains(items, i => i.Topic == "bulgaria");
        Assert.Equal(2, items.Count(i => i.Topic == "technology"));
    }

    [Fact]
    public async Task Skips_a_bad_feed_but_keeps_the_good_one()
    {
        var client = Create(
            ("https://t.test/rss", "technology", TechRss),
            ("https://bad.test/feed", "world", null)); // 500 → skipped

        var items = await client.GetItemsAsync();

        Assert.All(items, i => Assert.NotEqual("world", i.Topic));
        Assert.NotEmpty(items);
    }

    [Fact]
    public async Task Throws_when_no_feeds_configured()
    {
        var client = new RssClient(new HttpClient(new StubHandler([])), Options.Create(new RssOptions()));
        await Assert.ThrowsAsync<InvalidOperationException>(() => client.GetItemsAsync());
    }

    private static RssClient Create(params (string Url, string Topic, string? Body)[] feeds) =>
        Create(25, feeds);

    private static RssClient Create(int maxPerTopic, params (string Url, string Topic, string? Body)[] feeds)
    {
        var handler = new StubHandler(feeds.ToDictionary(f => f.Url, f => f.Body));
        var options = Options.Create(new RssOptions
        {
            MaxItemsPerTopic = maxPerTopic,
            Feeds = [.. feeds.Select(f => new FeedConfig { Url = f.Url, Topic = f.Topic })],
        });
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
