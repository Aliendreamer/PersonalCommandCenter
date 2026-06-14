using System.Net;
using System.Net.Http.Json;
using CoreApi.Tests.Auth;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Pcc.Plugins.Goodreads;

namespace CoreApi.Tests;

public class GoodreadsEndpointTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory = factory;

    [Fact]
    public async Task Returns_books()
    {
        var client = AuthedWith(new FakeGoodreads([
            new Book("Dune", "Frank Herbert", "https://gr.test/1", "https://img.test/dune.jpg"),
        ]));

        var books = await client.GetFromJsonAsync<List<BookDto>>("/api/goodreads");

        Assert.NotNull(books);
        Assert.Contains(books!, b => b.Title == "Dune" && b.Author == "Frank Herbert");
    }

    [Fact]
    public async Task Requires_authentication()
    {
        var response = await _factory.CreateClient().GetAsync("/api/goodreads");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Returns_502_when_goodreads_fails()
    {
        var client = AuthedWith(new ThrowingGoodreads());
        var response = await client.GetAsync("/api/goodreads");
        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
    }

    [Fact]
    public async Task Absent_when_disabled()
    {
        Environment.SetEnvironmentVariable("Plugins__Goodreads__Enabled", "false");
        try
        {
            await using var factory = new WebApplicationFactory<Program>();
            var client = factory.AuthedClient();

            var response = await client.GetAsync("/api/goodreads");
            var plugins = await client.GetFromJsonAsync<List<PluginDto>>("/api/plugins");

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
            Assert.DoesNotContain(plugins!, p => p.Id == "goodreads");
        }
        finally
        {
            Environment.SetEnvironmentVariable("Plugins__Goodreads__Enabled", null);
        }
    }

    private HttpClient AuthedWith(IGoodreadsClient goodreads)
    {
        var client = _factory.Authed(s => s.AddSingleton(goodreads)).CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.Header, "1");
        return client;
    }

    private sealed record BookDto(string Title, string? Author, string Link, string? CoverUrl);

    private sealed record PluginDto(string Id);

    private sealed class FakeGoodreads(IReadOnlyList<Book> books) : IGoodreadsClient
    {
        public Task<IReadOnlyList<Book>> GetShelfAsync(CancellationToken ct = default) =>
            Task.FromResult(books);
    }

    private sealed class ThrowingGoodreads : IGoodreadsClient
    {
        public Task<IReadOnlyList<Book>> GetShelfAsync(CancellationToken ct = default) =>
            throw new HttpRequestException("Goodreads unreachable");
    }
}
