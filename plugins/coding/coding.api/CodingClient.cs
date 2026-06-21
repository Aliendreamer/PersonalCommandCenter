using System.Globalization;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace Pcc.Plugins.Coding;

/// <summary>Reads the Wakapi summary for a range (one call) and shapes it into <see cref="CodingStatus"/>.</summary>
public sealed class CodingClient(HttpClient http, IOptions<CodingOptions> options) : ICodingClient
{
    private const int PerDayTop = 8;
    private const int AggregateTop = 15;

    private readonly CodingOptions _options = options.Value;

    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true,
    };

    public async Task<CodingStatus> GetStatusAsync(
        string range, CancellationToken cancellationToken = default)
    {
        var baseUrl = _options.BaseUrl?.TrimEnd('/');
        if (string.IsNullOrEmpty(baseUrl) || string.IsNullOrEmpty(_options.ApiKey))
        {
            throw new InvalidOperationException("Plugins:Coding:BaseUrl and ApiKey must be configured.");
        }

        var url = $"{baseUrl}/api/compat/wakatime/v1/users/current/summaries?range={range}";
        using var request = new HttpRequestMessage(HttpMethod.Get, new Uri(url));
        request.Headers.Authorization = new AuthenticationHeaderValue(
            "Basic", Convert.ToBase64String(Encoding.UTF8.GetBytes(_options.ApiKey)));

        using var response = await http.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
        var bytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);
        var summary = JsonSerializer.Deserialize<SummaryDto>(bytes, Json);

        var days = (summary?.Data ?? [])
            .Select(d => new CodingDay(
                DayDate(d.Range?.Start),
                d.GrandTotal?.TotalSeconds ?? 0,
                Top(d.Projects, PerDayTop),
                Top(d.Languages, PerDayTop)))
            .ToList();

        // Today's seconds = the latest day, but only when it is actually today (UTC): a day with no
        // activity yet is absent from the Wakapi response, so `days[^1]` would otherwise be a prior day.
        var today = DateTimeOffset.UtcNow.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        return new CodingStatus(
            range,
            summary?.CumulativeTotal?.Seconds ?? 0,
            days.Count > 0 && days[^1].Date == today ? days[^1].Seconds : 0,
            days,
            Aggregate(summary?.Data, d => d.Projects),
            Aggregate(summary?.Data, d => d.Languages));
    }

    private static string DayDate(string? start) =>
        DateTimeOffset.TryParse(start, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt)
            ? dt.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)
            : start ?? "";

    /// <summary>One day's breakdown, descending, capped at <paramref name="top"/>.</summary>
    private static IReadOnlyList<CodingBucket> Top(List<BucketDto>? buckets, int top) =>
        (buckets ?? [])
            .Select(b => new CodingBucket(b.Name, b.TotalSeconds))
            .Where(b => b.Seconds > 0)
            .OrderByDescending(b => b.Seconds)
            .Take(top)
            .ToList();

    /// <summary>Sums a breakdown (projects or languages) by name across the range, descending, top-N.</summary>
    private static IReadOnlyList<CodingBucket> Aggregate(
        IEnumerable<DayDto>? data, Func<DayDto, List<BucketDto>?> pick) =>
        (data ?? [])
            .SelectMany(d => pick(d) ?? [])
            .GroupBy(b => b.Name, StringComparer.Ordinal)
            .Select(g => new CodingBucket(g.Key, g.Sum(b => b.TotalSeconds)))
            .Where(b => b.Seconds > 0)
            .OrderByDescending(b => b.Seconds)
            .Take(AggregateTop)
            .ToList();

    private sealed record SummaryDto(List<DayDto>? Data, TotalDto? CumulativeTotal);

    private sealed record DayDto(
        GrandTotalDto? GrandTotal, RangeDto? Range, List<BucketDto>? Projects, List<BucketDto>? Languages);

    private sealed record GrandTotalDto(long TotalSeconds);

    private sealed record RangeDto(string? Start);

    private sealed record BucketDto(string Name, long TotalSeconds);

    private sealed record TotalDto(long Seconds);
}
