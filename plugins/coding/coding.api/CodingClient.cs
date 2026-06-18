using System.Globalization;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace Pcc.Plugins.Coding;

/// <summary>Reads the Wakapi weekly summary (one call) and shapes it into <see cref="CodingStatus"/>.</summary>
public sealed class CodingClient(HttpClient http, IOptions<CodingOptions> options) : ICodingClient
{
    private readonly CodingOptions _options = options.Value;

    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true,
    };

    public async Task<CodingStatus> GetStatusAsync(CancellationToken cancellationToken = default)
    {
        var baseUrl = _options.BaseUrl?.TrimEnd('/');
        if (string.IsNullOrEmpty(baseUrl) || string.IsNullOrEmpty(_options.ApiKey))
        {
            throw new InvalidOperationException("Plugins:Coding:BaseUrl and ApiKey must be configured.");
        }

        var url = $"{baseUrl}/api/compat/wakatime/v1/users/current/summaries?range=week";
        using var request = new HttpRequestMessage(HttpMethod.Get, new Uri(url));
        request.Headers.Authorization = new AuthenticationHeaderValue(
            "Basic", Convert.ToBase64String(Encoding.UTF8.GetBytes(_options.ApiKey)));

        using var response = await http.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
        var bytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);
        var week = JsonSerializer.Deserialize<WeekDto>(bytes, Json);

        var days = (week?.Data ?? [])
            .Select(d => new CodingDay(DayDate(d.Range?.Start), d.GrandTotal?.TotalSeconds ?? 0))
            .ToList();

        return new CodingStatus(
            week?.CumulativeTotal?.Seconds ?? 0,
            days.Count > 0 ? days[^1].Seconds : 0,
            days,
            Aggregate(week?.Data, d => d.Projects),
            Aggregate(week?.Data, d => d.Languages));
    }

    private static string DayDate(string? start) =>
        DateTimeOffset.TryParse(start, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt)
            ? dt.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)
            : start ?? "";

    /// <summary>Sums a per-day breakdown (projects or languages) by name across the week, descending.</summary>
    private static IReadOnlyList<CodingBucket> Aggregate(
        IEnumerable<DayDto>? data, Func<DayDto, List<BucketDto>?> pick) =>
        (data ?? [])
            .SelectMany(d => pick(d) ?? [])
            .GroupBy(b => b.Name, StringComparer.Ordinal)
            .Select(g => new CodingBucket(g.Key, g.Sum(b => b.TotalSeconds)))
            .OrderByDescending(b => b.Seconds)
            .ToList();

    private sealed record WeekDto(List<DayDto>? Data, TotalDto? CumulativeTotal);

    private sealed record DayDto(
        GrandTotalDto? GrandTotal, RangeDto? Range, List<BucketDto>? Projects, List<BucketDto>? Languages);

    private sealed record GrandTotalDto(long TotalSeconds);

    private sealed record RangeDto(string? Start);

    private sealed record BucketDto(string Name, long TotalSeconds);

    private sealed record TotalDto(long Seconds);
}
