namespace Pcc.Plugins.Calendar;

/// <summary>
/// The endpoint-facing calendar client. Reads are the <b>merge</b> of every backing source (CalDAV +
/// Google when configured), sorted by start; a single source failing degrades to the others, and only
/// an all-sources failure surfaces as an error. Writes are <b>routed</b> to the source that owns the
/// event (its <c>source</c>); events are never mirrored between backends.
/// </summary>
public sealed class AggregateCalendarClient(IReadOnlyList<ICalendarSourceClient> sources) : ICalendarClient
{
    public async Task<IReadOnlyList<CalendarEvent>> ListAsync(DateTimeOffset from, DateTimeOffset to, CancellationToken cancellationToken = default)
    {
        var results = await Task.WhenAll(sources.Select(async source =>
        {
            try
            {
                return (IReadOnlyList<CalendarEvent>?)await source.ListAsync(from, to, cancellationToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                return null; // this source degraded — drop it from the merge
            }
        }));

        if (results.Length > 0 && results.All(r => r is null))
        {
            throw new InvalidOperationException("All calendar sources failed.");
        }

        return results
            .Where(r => r is not null)
            .SelectMany(r => r!)
            .OrderBy(e => e.Start)
            .ToList();
    }

    public Task<CalendarEvent> CreateAsync(CalendarEventInput input, string target, CancellationToken cancellationToken = default) =>
        SourceFor(target).CreateAsync(input, cancellationToken);

    public Task<CalendarEvent?> UpdateAsync(string uid, CalendarEventInput input, string source, CancellationToken cancellationToken = default) =>
        SourceFor(source).UpdateAsync(uid, input, cancellationToken);

    public Task<bool> DeleteAsync(string uid, string source, CancellationToken cancellationToken = default) =>
        SourceFor(source).DeleteAsync(uid, cancellationToken);

    private ICalendarSourceClient SourceFor(string source) =>
        sources.FirstOrDefault(s => string.Equals(s.Source, source, StringComparison.Ordinal))
        ?? throw new InvalidOperationException($"Calendar source '{source}' is not available.");
}
