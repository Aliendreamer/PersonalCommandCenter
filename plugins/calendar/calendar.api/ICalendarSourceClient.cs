namespace Pcc.Plugins.Calendar;

/// <summary>
/// One calendar backend (CalDAV/Radicale = <c>"pcc"</c>, Google = <c>"google"</c>). The aggregate
/// client (<see cref="ICalendarClient"/>) merges these for reads and routes writes to the one that
/// owns an event by its <see cref="Source"/>.
/// </summary>
public interface ICalendarSourceClient
{
    /// <summary>Stable identifier for this backend, stamped onto every event's <c>Source</c>.</summary>
    string Source { get; }

    Task<IReadOnlyList<CalendarEvent>> ListAsync(DateTimeOffset from, DateTimeOffset to, CancellationToken cancellationToken = default);

    Task<CalendarEvent> CreateAsync(CalendarEventInput input, CancellationToken cancellationToken = default);

    Task<CalendarEvent?> UpdateAsync(string uid, CalendarEventInput input, CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(string uid, CancellationToken cancellationToken = default);
}
