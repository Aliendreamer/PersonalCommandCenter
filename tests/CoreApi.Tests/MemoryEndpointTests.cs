using System.Net;
using System.Net.Http.Json;
using CoreApi.Tests.Auth;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Pcc.Plugins.Memory;

namespace CoreApi.Tests;

public class MemoryEndpointTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory = factory;

    private static readonly MemoryEntry[] SampleEntries =
    [
        new MemoryEntry(Guid.NewGuid(), "Paris is the capital of France", ["geography"], DateTimeOffset.UtcNow, 0.95),
    ];

    [Fact]
    public async Task Returns_stored_memory_id_on_post()
    {
        var client = AuthedWith(new FakeQdrantClient(), new FakeOllamaClient());
        var response = await client.PostAsJsonAsync("/api/memory", new { content = "Test memory", tags = new[] { "test" } });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<IdDto>();
        Assert.NotNull(body);
        Assert.NotEqual(Guid.Empty, body!.Id);
    }

    [Fact]
    public async Task Recalls_memories_via_search_when_q_provided()
    {
        var qdrant = new FakeQdrantClient(scrollResults: [], searchResults: SampleEntries);
        var client = AuthedWith(qdrant, new FakeOllamaClient());
        var items = await client.GetFromJsonAsync<List<EntryDto>>("/api/memory?q=capitals");
        Assert.NotNull(items);
        Assert.NotEmpty(items!);
    }

    [Fact]
    public async Task Returns_recent_memories_when_no_q()
    {
        var qdrant = new FakeQdrantClient(scrollResults: SampleEntries, searchResults: []);
        var client = AuthedWith(qdrant, new FakeOllamaClient());
        var items = await client.GetFromJsonAsync<List<EntryDto>>("/api/memory");
        Assert.NotNull(items);
        Assert.NotEmpty(items!);
    }

    [Fact]
    public async Task Delete_returns_204()
    {
        var id = Guid.NewGuid();
        var client = AuthedWith(new FakeQdrantClient(), new FakeOllamaClient());
        var response = await client.DeleteAsync($"/api/memory/{id}");
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Returns_502_when_qdrant_fails()
    {
        var client = AuthedWith(new ThrowingQdrantClient(), new FakeOllamaClient());
        var response = await client.GetAsync("/api/memory");
        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
    }

    [Fact]
    public async Task Requires_authentication()
    {
        var response = await _factory.CreateClient().GetAsync("/api/memory");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Absent_when_disabled()
    {
        Environment.SetEnvironmentVariable("Plugins__Memory__Enabled", "false");
        try
        {
            await using var factory = new WebApplicationFactory<Program>();
            var client = factory.AuthedClient();

            var response = await client.GetAsync("/api/memory");
            var plugins = await client.GetFromJsonAsync<List<PluginDto>>("/api/plugins");

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
            Assert.DoesNotContain(plugins!, p => p.Id == "memory");
        }
        finally
        {
            Environment.SetEnvironmentVariable("Plugins__Memory__Enabled", null);
        }
    }

    private HttpClient AuthedWith(IQdrantClient qdrant, IOllamaEmbeddingClient ollama)
    {
        var client = _factory.Authed(s =>
        {
            s.AddSingleton(qdrant);
            s.AddSingleton(ollama);
        }).CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.Header, "1");
        return client;
    }

    private sealed record IdDto(Guid Id);

    private sealed record EntryDto(Guid Id, string Content);

    private sealed record PluginDto(string Id);

    private sealed class FakeQdrantClient(
        IReadOnlyList<MemoryEntry>? scrollResults = null,
        IReadOnlyList<MemoryEntry>? searchResults = null) : IQdrantClient
    {
        private readonly IReadOnlyList<MemoryEntry> _scrollResults = scrollResults ?? [];
        private readonly IReadOnlyList<MemoryEntry> _searchResults = searchResults ?? [];

        public Task EnsureCollectionAsync(string name, int vectorSize, CancellationToken ct = default) =>
            Task.CompletedTask;

        public Task UpsertAsync(string collection, Guid id, float[] vector, MemoryItem item, CancellationToken ct = default) =>
            Task.CompletedTask;

        public Task<IReadOnlyList<MemoryEntry>> SearchAsync(string collection, float[] vector, int limit, CancellationToken ct = default) =>
            Task.FromResult(_searchResults);

        public Task<IReadOnlyList<MemoryEntry>> ScrollAsync(string collection, int limit, CancellationToken ct = default) =>
            Task.FromResult(_scrollResults);

        public Task DeleteAsync(string collection, Guid id, CancellationToken ct = default) =>
            Task.CompletedTask;
    }

    private sealed class FakeOllamaClient : IOllamaEmbeddingClient
    {
        public Task<float[]> EmbedAsync(string model, string text, CancellationToken ct = default) =>
            Task.FromResult(new float[768].Select(_ => 0.1f).ToArray());
    }

    private sealed class ThrowingQdrantClient : IQdrantClient
    {
        public Task EnsureCollectionAsync(string name, int vectorSize, CancellationToken ct = default) =>
            Task.CompletedTask;

        public Task UpsertAsync(string collection, Guid id, float[] vector, MemoryItem item, CancellationToken ct = default) =>
            throw new HttpRequestException("qdrant unreachable");

        public Task<IReadOnlyList<MemoryEntry>> SearchAsync(string collection, float[] vector, int limit, CancellationToken ct = default) =>
            throw new HttpRequestException("qdrant unreachable");

        public Task<IReadOnlyList<MemoryEntry>> ScrollAsync(string collection, int limit, CancellationToken ct = default) =>
            throw new HttpRequestException("qdrant unreachable");

        public Task DeleteAsync(string collection, Guid id, CancellationToken ct = default) =>
            throw new HttpRequestException("qdrant unreachable");
    }
}
