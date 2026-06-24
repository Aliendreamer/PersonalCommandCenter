using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace Pcc.Plugins.Memory;

/// <summary>Queries Qdrant's REST API for vector upsert, search, scroll, and delete.</summary>
public sealed class QdrantClient(HttpClient http, IOptions<MemoryOptions> options) : IQdrantClient
{
    private readonly MemoryOptions _options = options.Value;

    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public async Task EnsureCollectionAsync(string name, int vectorSize, CancellationToken ct = default)
    {
        var baseUrl = _options.QdrantBaseUrl.TrimEnd('/');
        var body = new { vectors = new { size = vectorSize, distance = "Cosine" } };
        var response = await http.PutAsJsonAsync(new Uri($"{baseUrl}/collections/{name}"), body, Json, ct);
        if (response.StatusCode != HttpStatusCode.OK && response.StatusCode != HttpStatusCode.Conflict)
        {
            response.EnsureSuccessStatusCode();
        }
    }

    public async Task UpsertAsync(string collection, Guid id, float[] vector, MemoryItem item, CancellationToken ct = default)
    {
        var baseUrl = _options.QdrantBaseUrl.TrimEnd('/');
        var body = new
        {
            points = new[]
            {
                new
                {
                    id = id.ToString(),
                    vector,
                    payload = new
                    {
                        content = item.Content,
                        tags = item.Tags,
                        created_at = item.CreatedAt.ToUnixTimeSeconds(),
                    },
                },
            },
        };
        var response = await http.PutAsJsonAsync(new Uri($"{baseUrl}/collections/{collection}/points"), body, Json, ct);
        response.EnsureSuccessStatusCode();
    }

    public async Task<IReadOnlyList<MemoryEntry>> SearchAsync(string collection, float[] vector, int limit, CancellationToken ct = default)
    {
        var baseUrl = _options.QdrantBaseUrl.TrimEnd('/');
        var body = new { vector, limit, with_payload = true };
        var response = await http.PostAsJsonAsync(new Uri($"{baseUrl}/collections/{collection}/points/search"), body, Json, ct);
        response.EnsureSuccessStatusCode();
        var payload = await response.Content.ReadFromJsonAsync<SearchResponse>(Json, ct);
        return (payload?.Result ?? []).Select(r => new MemoryEntry(
            Guid.Parse(r.Id),
            r.Payload?.Content ?? "",
            r.Payload?.Tags ?? [],
            DateTimeOffset.FromUnixTimeSeconds(r.Payload?.CreatedAt ?? 0),
            r.Score)).ToList();
    }

    public async Task<IReadOnlyList<MemoryEntry>> ScrollAsync(string collection, int limit, CancellationToken ct = default)
    {
        var baseUrl = _options.QdrantBaseUrl.TrimEnd('/');
        var body = new
        {
            limit,
            with_payload = true,
            order_by = new { key = "created_at", direction = "desc" },
        };
        var response = await http.PostAsJsonAsync(new Uri($"{baseUrl}/collections/{collection}/points/scroll"), body, Json, ct);
        response.EnsureSuccessStatusCode();
        var payload = await response.Content.ReadFromJsonAsync<ScrollResponse>(Json, ct);
        return (payload?.Result?.Points ?? []).Select(p => new MemoryEntry(
            Guid.Parse(p.Id),
            p.Payload?.Content ?? "",
            p.Payload?.Tags ?? [],
            DateTimeOffset.FromUnixTimeSeconds(p.Payload?.CreatedAt ?? 0),
            0.0)).ToList();
    }

    public async Task DeleteAsync(string collection, Guid id, CancellationToken ct = default)
    {
        var baseUrl = _options.QdrantBaseUrl.TrimEnd('/');
        var body = new { points = new[] { id.ToString() } };
        var response = await http.PostAsJsonAsync(new Uri($"{baseUrl}/collections/{collection}/points/delete"), body, Json, ct);
        if (response.StatusCode != HttpStatusCode.OK && response.StatusCode != HttpStatusCode.NotFound)
        {
            response.EnsureSuccessStatusCode();
        }
    }

    // Response DTOs
    private sealed record SearchResponse(List<SearchHit>? Result);

    private sealed record SearchHit(string Id, double Score, PointPayload? Payload);

    private sealed record ScrollResponse(ScrollResult? Result);

    private sealed record ScrollResult(List<ScrollPoint>? Points);

    private sealed record ScrollPoint(string Id, PointPayload? Payload);

    private sealed record PointPayload(string? Content, string[]? Tags, long CreatedAt);
}
