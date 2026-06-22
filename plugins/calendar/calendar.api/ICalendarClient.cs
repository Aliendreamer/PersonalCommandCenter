namespace Pcc.Plugins.Calendar;

/// <summary>
/// The endpoint-facing calendar client: merged reads across all backends and writes routed to the
/// owning backend by <c>source</c>. Abstracted so endpoints/tests can fake it.
/// </summary>
public interface ICalendarClient
{
    /// <summary>The merge of every source's events whose start falls within [from, to), sorted by start.</summary>
    Task<IReadOnlyList<CalendarEvent>> ListAsync(DateTimeOffset from, DateTimeOffset to, CancellationToken cancellationToken = default);

    /// <summary>Creates an event in the <paramref name="target"/> calendar (e.g. <c>"pcc"</c>/<c>"google"</c>).</summary>
    Task<CalendarEvent> CreateAsync(CalendarEventInput input, string target, CancellationToken cancellationToken = default);

    /// <summary>Updates an event in its owning <paramref name="source"/>; returns <c>null</c> when unknown.</summary>
    Task<CalendarEvent?> UpdateAsync(string uid, CalendarEventInput input, string source, CancellationToken cancellationToken = default);

    /// <summary>Deletes an event from its owning <paramref name="source"/>; returns <c>false</c> when unknown.</summary>
    Task<bool> DeleteAsync(string uid, string source, CancellationToken cancellationToken = default);
}
