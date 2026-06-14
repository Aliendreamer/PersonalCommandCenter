namespace Pcc.Plugins.Calendar;

/// <summary>A calendar event (VEVENT), slimmed to what the command center renders and edits.</summary>
public sealed record CalendarEvent(
    string Uid,
    string Title,
    DateTimeOffset Start,
    DateTimeOffset End,
    bool AllDay,
    string? Location,
    string? Description);

/// <summary>The writable fields of an event (create/update); the server owns the <c>Uid</c>.</summary>
public sealed record CalendarEventInput(
    string Title,
    DateTimeOffset Start,
    DateTimeOffset End,
    bool AllDay = false,
    string? Location = null,
    string? Description = null);
