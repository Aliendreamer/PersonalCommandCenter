namespace Pcc.Plugins.Coding;

/// <summary>One day's coding time (from a Wakapi weekly summary element).</summary>
public sealed record CodingDay(string Date, long Seconds);

/// <summary>A named slice of coding time (a project or language), in seconds.</summary>
public sealed record CodingBucket(string Name, long Seconds);

/// <summary>The coding-activity board surfaced by <c>GET /api/coding</c> (raw seconds; the web layer formats).</summary>
public sealed record CodingStatus(
    long WeekSeconds,
    long TodaySeconds,
    IReadOnlyList<CodingDay> Days,
    IReadOnlyList<CodingBucket> Projects,
    IReadOnlyList<CodingBucket> Languages);
