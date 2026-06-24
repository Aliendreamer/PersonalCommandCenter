using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace Pcc.Plugins.Memory;

/// <summary>Calls Ollama's <c>/api/embeddings</c> endpoint to produce text embeddings.</summary>
public sealed class OllamaEmbeddingClient(HttpClient http, IOptions<MemoryOptions> options) : IOllamaEmbeddingClient
{
    private readonly MemoryOptions _options = options.Value;

    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true,
    };

    public async Task<float[]> EmbedAsync(string model, string text, CancellationToken ct = default)
    {
        var baseUrl = _options.OllamaBaseUrl.TrimEnd('/');
        var request = new { model, prompt = text };
        var response = await http.PostAsJsonAsync(new Uri($"{baseUrl}/api/embeddings"), request, Json, ct);
        response.EnsureSuccessStatusCode();
        var payload = await response.Content.ReadFromJsonAsync<EmbeddingResponse>(Json, ct);
        return payload?.Embedding ?? [];
    }

    private sealed record EmbeddingResponse(float[] Embedding);
}
