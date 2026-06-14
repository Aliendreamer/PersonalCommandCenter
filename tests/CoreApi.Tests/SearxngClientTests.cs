using System.Net;
using Microsoft.Extensions.Options;
using Pcc.Plugins.Search;

namespace CoreApi.Tests;

public class SearxngClientTests
{
    private const string Json = """
        {
          "results": [
            { "title": "TanStack", "url": "https://tanstack.com/", "content": "App stack", "engine": "google" },
            { "title": "No URL", "url": "", "content": "skip me" }
          ]
        }
        """;

    [Fact]
    public async Task Maps_results_and_drops_entries_without_a_url()
    {
        var client = CreateClient(Json, out _);

        var results = await client.SearchAsync("tanstack");

        var only = Assert.Single(results);
        Assert.Equal("TanStack", only.Title);
        Assert.Equal("https://tanstack.com/", only.Url);
        Assert.Equal("google", only.Engine);
    }

    [Fact]
    public async Task Sends_query_and_json_format()
    {
        var client = CreateClient(Json, out var handler);

        await client.SearchAsync("hello world");

        Assert.NotNull(handler.LastRequest);
        var uri = handler.LastRequest!.RequestUri!.AbsoluteUri;
        Assert.StartsWith("http://searxng.test:8080/search?", uri, StringComparison.Ordinal);
        Assert.Contains("q=hello%20world", uri, StringComparison.Ordinal);
        Assert.Contains("format=json", uri, StringComparison.Ordinal);
    }

    private static SearxngClient CreateClient(string json, out StubHandler handler)
    {
        handler = new StubHandler(json);
        var options = Options.Create(new SearchOptions { BaseUrl = "http://searxng.test:8080" });
        return new SearxngClient(new HttpClient(handler), options);
    }

    private sealed class StubHandler(string json) : HttpMessageHandler
    {
        public HttpRequestMessage? LastRequest { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            LastRequest = request;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json, System.Text.Encoding.UTF8, "application/json"),
            });
        }
    }
}
