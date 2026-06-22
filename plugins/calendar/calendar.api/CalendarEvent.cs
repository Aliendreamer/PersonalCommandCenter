namespace Pcc.Plugins.Calendar;

/// <summary>A calendar event, slimmed to what the command center renders and edits. <c>Source</c>
/// identifies the owning backend (<c>"pcc"</c> CalDAV or <c>"google"</c>) so writes route correctly.</summary>
public sealed record CalendarEvent(
    string Uid,
    string Title,
    DateTimeOffset Start,
    DateTimeOffset End,
    bool AllDay,
    string? Location,
    string? Description,
    string Source = "pcc");

/// <summary>The writable fields of an event (create/update); the server owns the <c>Uid</c>.</summary>
public sealed record CalendarEventInput(
    string Title,
    DateTimeOffset Start,
    DateTimeOffset End,
    bool AllDay = false,
    string? Location = null,
    string? Description = null);
