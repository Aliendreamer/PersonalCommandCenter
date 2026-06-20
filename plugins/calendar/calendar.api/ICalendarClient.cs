namespace Pcc.Plugins.Calendar;

/// <summary>Reads and writes calendar events over CalDAV. Abstracted so endpoints/tests can fake it.</summary>
public interface ICalendarClient
{
    /// <summary>Events whose start falls within the half-open range [from, to).</summary>
    Task<IReadOnlyList<CalendarEvent>> ListAsync(DateTimeOffset from, DateTimeOffset to, CancellationToken cancellationToken = default);

    /// <summary>Creates an event and returns it with its server-assigned <c>Uid</c>.</summary>
    Task<CalendarEvent> CreateAsync(CalendarEventInput input, CancellationToken cancellationToken = default);

    /// <summary>Updates an existing event; returns <c>null</c> when the uid is unknown.</summary>
    Task<CalendarEvent?> UpdateAsync(string uid, CalendarEventInput input, CancellationToken cancellationToken = default);

    /// <summary>Deletes an event; returns <c>false</c> when the uid is unknown.</summary>
    Task<bool> DeleteAsync(string uid, CancellationToken cancellationToken = default);
}
