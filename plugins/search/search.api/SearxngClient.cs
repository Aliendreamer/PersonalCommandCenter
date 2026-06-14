using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace Pcc.Plugins.Search;

/// <summary>Queries SearXNG's JSON API and maps the result list.</summary>
public sealed class SearxngClient(HttpClient http, IOptions<SearchOptions> options) : ISearchClient
{
    private readonly SearchOptions _options = options.Value;

    public async Task<IReadOnlyList<SearchResult>> SearchAsync(string query, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(_options.BaseUrl))
        {
            throw new InvalidOperationException("Search:BaseUrl is not configured.");
        }

        var url = $"{_options.BaseUrl.TrimEnd('/')}/search?q={Uri.EscapeDataString(query)}&format=json";
        using var response = await http.GetAsync(new Uri(url), cancellationToken);
        response.EnsureSuccessStatusCode();

        var payload = await response.Content.ReadFromJsonAsync<SearxngResponse>(cancellationToken);
        var results = payload?.Results ?? [];
        return results
            .Where(r => !string.IsNullOrEmpty(r.Url) && !string.IsNullOrEmpty(r.Title))
            .Take(_options.MaxResults)
            .Select(r => new SearchResult(r.Title!, r.Url!, r.Content, r.Engine))
            .ToList();
    }

    private sealed record SearxngResponse(
        [property: JsonPropertyName("results")] List<SearxngResult>? Results);

    private sealed record SearxngResult(
        [property: JsonPropertyName("title")] string? Title,
        [property: JsonPropertyName("url")] string? Url,
        [property: JsonPropertyName("content")] string? Content,
        [property: JsonPropertyName("engine")] string? Engine);
}
