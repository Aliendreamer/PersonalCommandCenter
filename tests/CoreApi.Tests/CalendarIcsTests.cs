using Pcc.Plugins.Calendar;

namespace CoreApi.Tests;

public class CalendarIcsTests
{
    [Fact]
    public void Round_trips_a_timed_event()
    {
        var input = new CalendarEventInput(
            "Standup",
            new DateTimeOffset(2026, 6, 15, 9, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 6, 15, 9, 30, 0, TimeSpan.Zero),
            AllDay: false,
            Location: "Room 1",
            Description: "Daily sync");

        var ics = CalendarIcs.Serialize("uid-1", input);
        var parsed = Assert.Single(CalendarIcs.ParseEvents(ics));

        Assert.Equal("uid-1", parsed.Uid);
        Assert.Equal("Standup", parsed.Title);
        Assert.False(parsed.AllDay);
        Assert.Equal(input.Start, parsed.Start);
        Assert.Equal(input.End, parsed.End);
        Assert.Equal("Room 1", parsed.Location);
        Assert.Equal("Daily sync", parsed.Description);
    }

    [Fact]
    public void Round_trips_an_all_day_event_as_date_values()
    {
        var input = new CalendarEventInput(
            "Holiday",
            new DateTimeOffset(2026, 12, 25, 0, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 12, 26, 0, 0, 0, TimeSpan.Zero),
            AllDay: true);

        var ics = CalendarIcs.Serialize("uid-2", input);

        Assert.Contains("DTSTART;VALUE=DATE:20261225", ics, StringComparison.Ordinal);
        var parsed = Assert.Single(CalendarIcs.ParseEvents(ics));
        Assert.True(parsed.AllDay);
        Assert.Equal(input.Start, parsed.Start);
        Assert.Equal(input.End, parsed.End);
    }

    [Fact]
    public void Escapes_and_unescapes_special_characters()
    {
        var input = new CalendarEventInput(
            "Lunch; with, a\\note",
            new DateTimeOffset(2026, 6, 15, 12, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 6, 15, 13, 0, 0, TimeSpan.Zero));

        var ics = CalendarIcs.Serialize("uid-3", input);

        Assert.Contains("SUMMARY:Lunch\\; with\\, a\\\\note", ics, StringComparison.Ordinal);
        var parsed = Assert.Single(CalendarIcs.ParseEvents(ics));
        Assert.Equal("Lunch; with, a\\note", parsed.Title);
    }

    [Fact]
    public void Parses_caldav_calendar_data_with_crlf_and_folding()
    {
        // A VEVENT as a CalDAV server would return it: CRLF line endings + a folded DESCRIPTION.
        const string data =
            "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:remote-1\r\n" +
            "SUMMARY:Review\r\nDTSTART:20260615T140000Z\r\nDTEND:20260615T150000Z\r\n" +
            "DESCRIPTION:line one\r\n  and the rest\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n";

        var parsed = Assert.Single(CalendarIcs.ParseEvents(data));

        Assert.Equal("remote-1", parsed.Uid);
        Assert.Equal("Review", parsed.Title);
        Assert.Equal(new DateTimeOffset(2026, 6, 15, 14, 0, 0, TimeSpan.Zero), parsed.Start);
        Assert.Equal("line one and the rest", parsed.Description);
    }
}
