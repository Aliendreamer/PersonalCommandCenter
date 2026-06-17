using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;

namespace Pcc.Plugins.Models;

/// <summary>Queries Ollama (inventory) + the nvidia exporter (GPU); GPU failures degrade to an empty list.</summary>
public sealed partial class ModelsClient(HttpClient http, IOptions<ModelsOptions> options) : IModelsClient
{
    private readonly ModelsOptions _options = options.Value;

    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true,
    };

    public async Task<ModelsStatus> GetStatusAsync(CancellationToken cancellationToken = default)
    {
        var baseUrl = _options.Ollama.BaseUrl?.TrimEnd('/');
        if (string.IsNullOrEmpty(baseUrl))
        {
            throw new InvalidOperationException("Models:Ollama:BaseUrl is not configured.");
        }

        // Ollama is the primary source — any failure here surfaces (the endpoint maps it to 502).
        var version = await GetJsonAsync<VersionDto>($"{baseUrl}/api/version", cancellationToken);
        var tags = await GetJsonAsync<TagsDto>($"{baseUrl}/api/tags", cancellationToken);
        var ps = await GetJsonAsync<PsDto>($"{baseUrl}/api/ps", cancellationToken);

        var installed = (tags?.Models ?? []).Select(m => new InstalledModel(
            m.Name,
            m.Size,
            m.Details?.Family,
            m.Details?.ParameterSize,
            m.Details?.QuantizationLevel)).ToList();

        var running = (ps?.Models ?? []).Select(m => new RunningModel(m.Name, m.SizeVram)).ToList();

        // GPU telemetry is secondary — never fail the request for it.
        var gpus = await TryGetGpusAsync(cancellationToken);

        return new ModelsStatus(version?.Version ?? "", installed, running, gpus);
    }

    private async Task<T?> GetJsonAsync<T>(string url, CancellationToken ct)
    {
        var bytes = await http.GetByteArrayAsync(new Uri(url), ct);
        return JsonSerializer.Deserialize<T>(bytes, Json);
    }

    private async Task<IReadOnlyList<GpuStat>> TryGetGpusAsync(CancellationToken ct)
    {
        var url = _options.Gpu.ExporterUrl;
        if (string.IsNullOrEmpty(url))
        {
            return [];
        }

        try
        {
            var text = await http.GetStringAsync(new Uri(url), ct);
            return ParseGpus(text);
        }
        catch (Exception)
        {
            return [];
        }
    }

    /// <summary>Parses the nvidia exporter's Prometheus text into per-GPU stats (single-GPU dev box).</summary>
    public static IReadOnlyList<GpuStat> ParseGpus(string text)
    {
        var name = MetricName(text);
        if (name is null)
        {
            return [];
        }

        var util = FirstValue(text, "nvidia_smi_utilization_gpu_ratio");
        var utilPct = util is not null ? util.Value * 100 : FirstValue(text, "nvidia_smi_utilization_gpu") ?? 0;
        var temp = FirstValue(text, "nvidia_smi_temperature_gpu") ?? 0;
        var usedMb = ToMb(FirstValue(text, "nvidia_smi_memory_used_bytes"));
        var totalMb = ToMb(FirstValue(text, "nvidia_smi_memory_total_bytes"));

        return [new GpuStat(name, utilPct, temp, usedMb, totalMb)];
    }

    private static double ToMb(double? bytes) => bytes is not null ? Math.Round(bytes.Value / 1024 / 1024) : 0;

    private static string? MetricName(string text)
    {
        foreach (var line in text.Split('\n'))
        {
            if (line.StartsWith("nvidia_smi_gpu_info", StringComparison.Ordinal))
            {
                var match = NameLabel().Match(line);
                if (match.Success)
                {
                    return match.Groups[1].Value;
                }
            }
        }

        return null;
    }

    // First numeric value of a `metric{labels} value` (or `metric value`) line, ignoring comments.
    private static double? FirstValue(string text, string metric)
    {
        foreach (var line in text.Split('\n'))
        {
            if (line.Length == 0 || line[0] == '#')
            {
                continue;
            }

            if (line.StartsWith(metric + "{", StringComparison.Ordinal) ||
                line.StartsWith(metric + " ", StringComparison.Ordinal))
            {
                var brace = line.LastIndexOf('}');
                var valuePart = brace >= 0 ? line[(brace + 1)..] : line[metric.Length..];
                var token = valuePart.Trim().Split(' ', '\t').LastOrDefault();
                if (double.TryParse(token, NumberStyles.Float, CultureInfo.InvariantCulture, out var value))
                {
                    return value;
                }
            }
        }

        return null;
    }

    [GeneratedRegex("name=\"([^\"]*)\"")]
    private static partial Regex NameLabel();

    private sealed record VersionDto(string Version);

    private sealed record TagsDto(List<TagModel>? Models);

    private sealed record TagModel(string Name, long Size, TagDetails? Details);

    private sealed record TagDetails(string? Family, string? ParameterSize, string? QuantizationLevel);

    private sealed record PsDto(List<PsModel>? Models);

    private sealed record PsModel(string Name, long SizeVram);
}
