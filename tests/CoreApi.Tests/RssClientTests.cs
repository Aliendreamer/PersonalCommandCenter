using System.Net;
using Microsoft.Extensions.Options;
using Pcc.Plugins.Rss;

namespace CoreApi.Tests;

public class RssClientTests
{
    // Fake "now" for all tests — items dated within 3 days of this are fresh.
    private static readonly DateTimeOffset FakeNow = new(2026, 6, 24, 12, 0, 0, TimeSpan.Zero);

    // Jun 23 = Tuesday, Jun 22 = Monday (within 3 days of FakeNow)
    private const string TechRss = """
        <?xml version="1.0"?>
        <rss version="2.0"><channel>
          <title>TechSite</title>
          <item><title>Tech A</title><link>https://t.test/a</link>
            <description><![CDATA[<p>Hello <b>world</b></p>]]></description>
            <pubDate>Tue, 23 Jun 2026 10:00:00 GMT</pubDate></item>
          <item><title>Tech B</title><link>https://t.test/b</link>
            <pubDate>Mon, 22 Jun 2026 09:00:00 GMT</pubDate></item>
        </channel></rss>
        """;

    // Jun 22 = Monday (within 3 days)
    private const string BgRss = """
        <?xml version="1.0"?>
        <rss version="2.0"><channel>
          <title>BgSite</title>
          <item><title>Bg Recent</title><link>https://b.test/1</link>
            <pubDate>Mon, 22 Jun 2026 08:00:00 GMT</pubDate></item>
        </channel></rss>
        """;

    // Jun 20 = Saturday (4 days before FakeNow → stale with MaxAgeDays=3)
    private const string StaleRss = """
        <?xml version="1.0"?>
        <rss version="2.0"><channel>
          <title>StaleSite</title>
          <item><title>Stale Item</title><link>https://s.test/1</link>
            <pubDate>Sat, 20 Jun 2026 08:00:00 GMT</pubDate></item>
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
    public async Task Caps_items_per_feed()
    {
        var client = Create(maxPerFeed: 1, feeds: ("https://t.test/rss", "technology", TechRss));

        var items = await client.GetItemsAsync();

        Assert.Single(items);
        Assert.Equal("Tech A", items[0].Title); // newest kept
    }

    [Fact]
    public async Task Caps_each_feed_independently_so_all_feeds_keep_their_slot()
    {
        // technology has 2 items, bulgaria has 1; per-feed cap=1 → exactly 1 from each feed
        var client = Create(maxPerFeed: 1,
            feeds: new (string, string, string?)[]
            {
                ("https://t.test/rss", "technology", TechRss),
                ("https://b.test/rss", "bulgaria", BgRss),
            });

        var items = await client.GetItemsAsync();

        Assert.Single(items, i => i.Topic == "technology");
        Assert.Single(items, i => i.Topic == "bulgaria");
    }

    [Fact]
    public async Task Filters_out_items_older_than_max_age_days()
    {
        // TechRss items are within 3 days; StaleRss item is 4 days old → filtered out
        var client = Create(maxPerFeed: 10, maxAgeDays: 3,
            ("https://t.test/rss", "technology", TechRss),
            ("https://s.test/rss", "world", StaleRss));

        var items = await client.GetItemsAsync();

        Assert.NotEmpty(items);
        Assert.All(items, i => Assert.NotEqual("world", i.Topic));
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
        var client = new RssClient(
            new HttpClient(new StubHandler([])),
            Options.Create(new RssOptions()),
            new FakeTimeProvider(FakeNow));
        await Assert.ThrowsAsync<InvalidOperationException>(() => client.GetItemsAsync());
    }

    [Fact]
    public async Task Sends_a_neutral_user_agent_so_UA_blocking_feeds_are_not_403d()
    {
        var handler = new StubHandler(new Dictionary<string, string?> { ["https://t.test/rss"] = TechRss });
        var client = new RssClient(
            new HttpClient(handler),
            Options.Create(new RssOptions
            {
                Feeds = [new FeedConfig { Url = "https://t.test/rss", Topic = "technology" }],
            }),
            new FakeTimeProvider(FakeNow));

        await client.GetItemsAsync();

        Assert.Contains("PCC-RSS", handler.LastUserAgent ?? "");
    }

    private static RssClient Create(params (string Url, string Topic, string? Body)[] feeds) =>
        Create(maxPerFeed: 10, feeds);

    private static RssClient Create(int maxPerFeed, params (string Url, string Topic, string? Body)[] feeds) =>
        Create(maxPerFeed, maxAgeDays: 3, feeds);

    private static RssClient Create(int maxPerFeed, int maxAgeDays, params (string Url, string Topic, string? Body)[] feeds)
    {
        var handler = new StubHandler(feeds.ToDictionary(f => f.Url, f => f.Body));
        var options = Options.Create(new RssOptions
        {
            MaxItemsPerFeed = maxPerFeed,
            MaxAgeDays = maxAgeDays,
            Feeds = [.. feeds.Select(f => new FeedConfig { Url = f.Url, Topic = f.Topic })],
        });
        return new RssClient(new HttpClient(handler), options, new FakeTimeProvider(FakeNow));
    }

    private sealed class FakeTimeProvider(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }

    private sealed class StubHandler(Dictionary<string, string?> responses) : HttpMessageHandler
    {
        public string? LastUserAgent { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            LastUserAgent = request.Headers.UserAgent.ToString();
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
