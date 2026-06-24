using System.Net;
using System.Text;
using Microsoft.Extensions.Options;
using Pcc.Plugins.Memory;

namespace CoreApi.Tests;

public class MemoryClientTests
{
    private const string EmbeddingJson = """{"embedding":[0.1,0.2,0.3]}""";

    private const string SearchResponseJson = """
        {
          "result": [
            {
              "id": "550e8400-e29b-41d4-a716-446655440000",
              "score": 0.91,
              "payload": {
                "content": "Paris is the capital of France",
                "tags": ["geography"],
                "created_at": 1719230400
              }
            }
          ]
        }
        """;

    [Fact]
    public async Task OllamaEmbeddingClient_parses_embedding_response()
    {
        var handler = new StubHandler(new Dictionary<string, (HttpStatusCode, string)>
        {
            ["http://ollama.test:11434/api/embeddings"] = (HttpStatusCode.OK, EmbeddingJson),
        });
        var client = CreateOllamaClient(handler);

        var result = await client.EmbedAsync("nomic-embed-text", "hello world");

        Assert.Equal(3, result.Length);
        Assert.Equal(0.1f, result[0], precision: 5);
        Assert.Equal(0.2f, result[1], precision: 5);
        Assert.Equal(0.3f, result[2], precision: 5);
    }

    [Fact]
    public async Task QdrantClient_treats_409_as_success_for_ensure_collection()
    {
        var handler = new StubHandler(new Dictionary<string, (HttpStatusCode, string)>
        {
            ["http://qdrant.test:6333/collections/pcc_memory"] = (HttpStatusCode.Conflict, """{"status":"ok"}"""),
        });
        var client = CreateQdrantClient(handler);

        // Should not throw — 409 is treated as "already exists"
        await client.EnsureCollectionAsync("pcc_memory", 768);
    }

    [Fact]
    public async Task QdrantClient_maps_search_results_to_memory_entries()
    {
        var handler = new StubHandler(new Dictionary<string, (HttpStatusCode, string)>
        {
            ["http://qdrant.test:6333/collections/pcc_memory/points/search"] = (HttpStatusCode.OK, SearchResponseJson),
        });
        var client = CreateQdrantClient(handler);

        var results = await client.SearchAsync("pcc_memory", new float[3], 10);

        var entry = Assert.Single(results);
        Assert.Equal(Guid.Parse("550e8400-e29b-41d4-a716-446655440000"), entry.Id);
        Assert.Equal("Paris is the capital of France", entry.Content);
        Assert.Equal(["geography"], entry.Tags);
        Assert.Equal(0.91, entry.Score, precision: 2);
        Assert.Equal(DateTimeOffset.FromUnixTimeSeconds(1719230400), entry.CreatedAt);
    }

    private static OllamaEmbeddingClient CreateOllamaClient(HttpMessageHandler handler)
    {
        var options = Options.Create(new MemoryOptions
        {
            OllamaBaseUrl = "http://ollama.test:11434",
            EmbeddingModel = "nomic-embed-text",
        });
        return new OllamaEmbeddingClient(new HttpClient(handler), options);
    }

    private static QdrantClient CreateQdrantClient(HttpMessageHandler handler)
    {
        var options = Options.Create(new MemoryOptions
        {
            QdrantBaseUrl = "http://qdrant.test:6333",
        });
        return new QdrantClient(new HttpClient(handler), options);
    }

    private sealed class StubHandler(Dictionary<string, (HttpStatusCode Status, string Body)> responses)
        : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            var url = request.RequestUri!.AbsoluteUri;
            if (responses.TryGetValue(url, out var entry))
            {
                return Task.FromResult(new HttpResponseMessage(entry.Status)
                {
                    Content = new StringContent(entry.Body, Encoding.UTF8, "application/json"),
                });
            }

            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound));
        }
    }
}
