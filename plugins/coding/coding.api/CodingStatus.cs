namespace Pcc.Plugins.Coding;

/// <summary>A named slice of coding time (a project or language), in seconds.</summary>
public sealed record CodingBucket(string Name, long Seconds);

/// <summary>One day's coding time plus that day's own project/language breakdown.</summary>
public sealed record CodingDay(
    string Date,
    long Seconds,
    IReadOnlyList<CodingBucket> Projects,
    IReadOnlyList<CodingBucket> Languages);

/// <summary>The coding-activity board surfaced by <c>GET /api/coding</c> (raw seconds; the web layer formats).</summary>
public sealed record CodingStatus(
    string Range,
    long TotalSeconds,
    long TodaySeconds,
    IReadOnlyList<CodingDay> Days,
    IReadOnlyList<CodingBucket> Projects,
    IReadOnlyList<CodingBucket> Languages);
