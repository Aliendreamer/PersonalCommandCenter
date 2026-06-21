using System.Net;
using Microsoft.Extensions.Options;
using Pcc.Plugins.Goodreads;

namespace CoreApi.Tests;

public class GoodreadsClientTests
{
    // A trimmed Goodreads shelf RSS item: book title + custom author/cover/detail elements.
    private const string Rss = """
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0"><channel>
          <title>Reader's bookshelf: currently-reading</title>
          <item>
            <title>The Pragmatic Programmer</title>
            <link>https://www.goodreads.com/review/show/123</link>
            <book_image_url><![CDATA[https://img.test/small.jpg]]></book_image_url>
            <book_large_image_url><![CDATA[https://img.test/large.jpg]]></book_large_image_url>
            <author_name>Andrew Hunt</author_name>
            <book_description><![CDATA[<b>What others tell you</b> after you know the basics.]]></book_description>
            <average_rating>4.33</average_rating>
            <num_pages>352</num_pages>
            <book_published>1999</book_published>
          </item>
        </channel></rss>
        """;

    [Fact]
    public async Task Maps_title_author_link_and_cover()
    {
        var client = Create(Rss, out _);

        var book = Assert.Single(await client.GetShelfAsync());

        Assert.Equal("The Pragmatic Programmer", book.Title);
        Assert.Equal("Andrew Hunt", book.Author);
        Assert.Equal("https://www.goodreads.com/review/show/123", book.Link);
        Assert.Equal("https://img.test/large.jpg", book.CoverUrl);
    }

    [Fact]
    public async Task Maps_description_rating_pages_and_year()
    {
        var client = Create(Rss, out _);

        var book = Assert.Single(await client.GetShelfAsync());

        Assert.Contains("What others tell you", book.Description);
        Assert.Equal(4.33, book.AverageRating);
        Assert.Equal(352, book.NumPages);
        Assert.Equal(1999, book.Published);
    }

    [Fact]
    public async Task Requests_the_configured_user_and_shelf()
    {
        var client = Create(Rss, out var handler);

        await client.GetShelfAsync();

        var uri = handler.LastRequest!.RequestUri!.AbsoluteUri;
        Assert.Contains("/review/list_rss/42", uri, StringComparison.Ordinal);
        Assert.Contains("shelf=currently-reading", uri, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Sends_a_browser_user_agent()
    {
        // Goodreads returns 403 to requests without a User-Agent, so the shelf fetch must send one.
        var client = Create(Rss, out var handler);

        await client.GetShelfAsync();

        Assert.NotEmpty(handler.LastRequest!.Headers.UserAgent);
    }

    [Fact]
    public async Task Throws_when_no_user_configured()
    {
        var client = new GoodreadsClient(new HttpClient(new StubHandler("")), Options.Create(new GoodreadsOptions()));
        await Assert.ThrowsAsync<InvalidOperationException>(() => client.GetShelfAsync());
    }

    [Fact]
    public async Task Escapes_the_user_id_in_the_url()
    {
        var handler = new StubHandler(Rss);
        var client = new GoodreadsClient(new HttpClient(handler), Options.Create(new GoodreadsOptions
        {
            BaseUrl = "https://goodreads.test",
            UserId = "a b/c",
            Shelf = "currently-reading",
        }));

        await client.GetShelfAsync();

        Assert.Contains("/review/list_rss/a%20b%2Fc", handler.LastRequest!.RequestUri!.AbsoluteUri, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Throws_when_the_feed_returns_an_error_status()
    {
        // A 403 (e.g. Goodreads blocking the request) must surface as a failure → the endpoint degrades to 502.
        var client = new GoodreadsClient(
            new HttpClient(new StatusHandler(HttpStatusCode.Forbidden)),
            Options.Create(new GoodreadsOptions { BaseUrl = "https://goodreads.test", UserId = "42", Shelf = "read" }));

        await Assert.ThrowsAnyAsync<Exception>(() => client.GetShelfAsync());
    }

    [Fact]
    public async Task Throws_when_base_url_is_not_http()
    {
        var client = new GoodreadsClient(
            new HttpClient(new StubHandler(Rss)),
            Options.Create(new GoodreadsOptions { BaseUrl = "file:///etc/passwd", UserId = "42", Shelf = "read" }));

        await Assert.ThrowsAsync<InvalidOperationException>(() => client.GetShelfAsync());
    }

    private static GoodreadsClient Create(string rss, out StubHandler handler)
    {
        handler = new StubHandler(rss);
        var options = Options.Create(new GoodreadsOptions
        {
            BaseUrl = "https://goodreads.test",
            UserId = "42",
            Shelf = "currently-reading",
        });
        return new GoodreadsClient(new HttpClient(handler), options);
    }

    private sealed class StubHandler(string rss) : HttpMessageHandler
    {
        public HttpRequestMessage? LastRequest { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            LastRequest = request;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(rss, System.Text.Encoding.UTF8, "application/xml"),
            });
        }
    }

    private sealed class StatusHandler(HttpStatusCode status) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct) =>
            Task.FromResult(new HttpResponseMessage(status));
    }
}
