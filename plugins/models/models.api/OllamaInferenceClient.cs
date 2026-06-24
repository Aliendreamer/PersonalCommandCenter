using System.Diagnostics;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace Pcc.Plugins.Models;

/// <summary>Calls Ollama's generate + pull APIs. Registered as a typed HttpClient.</summary>
public sealed class OllamaInferenceClient(HttpClient http, IOptions<ModelsOptions> options) : IOllamaInferenceClient
{
    private readonly ModelsOptions _options = options.Value;

    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true,
    };

    public async Task<CompareResult> GenerateAsync(string model, string prompt, CancellationToken ct = default)
    {
        var baseUrl = _options.Ollama.BaseUrl.TrimEnd('/');
        var sw = Stopwatch.StartNew();
        try
        {
            var body = JsonSerializer.Serialize(
                new { model, prompt, stream = false },
                Json);

            using var request = new HttpRequestMessage(HttpMethod.Post, new Uri($"{baseUrl}/api/generate"))
            {
                Content = new StringContent(body, Encoding.UTF8, "application/json"),
            };

            var response = await http.SendAsync(request, ct);
            response.EnsureSuccessStatusCode();

            var bytes = await response.Content.ReadAsByteArrayAsync(ct);
            var dto = JsonSerializer.Deserialize<GenerateResponseDto>(bytes, Json);
            sw.Stop();

            return new CompareResult(model, dto?.Response, null, sw.ElapsedMilliseconds);
        }
        catch (Exception ex)
        {
            sw.Stop();
            return new CompareResult(model, null, ex.Message, sw.ElapsedMilliseconds);
        }
    }

    public async Task PullAsync(string name, CancellationToken ct = default)
    {
        var baseUrl = _options.Ollama.BaseUrl.TrimEnd('/');
        var body = JsonSerializer.Serialize(new { model = name, stream = false }, Json);

        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri($"{baseUrl}/api/pull"))
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json"),
        };

        var response = await http.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();
    }

    private sealed record GenerateResponseDto(string? Response);
}
