using System.Globalization;
using System.Text;

namespace Pcc.Plugins.Calendar;

/// <summary>
/// Minimal iCalendar (RFC 5545) VEVENT serialize/parse for the v1 subset: UID, SUMMARY, DTSTART,
/// DTEND, LOCATION, DESCRIPTION, all-day (<c>VALUE=DATE</c>) vs UTC-timed (<c>…Z</c>), with text
/// escaping and line unfolding. No recurrence/timezone handling (explicit v1 non-goals).
/// </summary>
public static class CalendarIcs
{
    private const string DateFormat = "yyyyMMdd";
    private const string DateTimeFormat = "yyyyMMdd'T'HHmmss";

    /// <summary>Serializes one event as a complete VCALENDAR (the body of a CalDAV <c>PUT</c>).</summary>
    public static string Serialize(string uid, CalendarEventInput input)
    {
        var sb = new StringBuilder();
        sb.Append("BEGIN:VCALENDAR\r\n");
        sb.Append("VERSION:2.0\r\n");
        sb.Append("PRODID:-//PCC//calendar//EN\r\n");
        sb.Append("BEGIN:VEVENT\r\n");
        sb.Append("UID:").Append(uid).Append("\r\n");
        sb.Append("DTSTAMP:").Append(FormatTimed(DateTimeOffset.UtcNow)).Append("\r\n");
        sb.Append("SUMMARY:").Append(Escape(input.Title)).Append("\r\n");

        if (input.AllDay)
        {
            sb.Append("DTSTART;VALUE=DATE:").Append(input.Start.ToString(DateFormat, CultureInfo.InvariantCulture)).Append("\r\n");
            sb.Append("DTEND;VALUE=DATE:").Append(input.End.ToString(DateFormat, CultureInfo.InvariantCulture)).Append("\r\n");
        }
        else
        {
            sb.Append("DTSTART:").Append(FormatTimed(input.Start)).Append("\r\n");
            sb.Append("DTEND:").Append(FormatTimed(input.End)).Append("\r\n");
        }

        if (!string.IsNullOrEmpty(input.Location))
        {
            sb.Append("LOCATION:").Append(Escape(input.Location)).Append("\r\n");
        }

        if (!string.IsNullOrEmpty(input.Description))
        {
            sb.Append("DESCRIPTION:").Append(Escape(input.Description)).Append("\r\n");
        }

        sb.Append("END:VEVENT\r\n");
        sb.Append("END:VCALENDAR\r\n");
        return sb.ToString();
    }

    /// <summary>Parses every VEVENT found in an iCalendar text (a VCALENDAR or a calendar-data fragment).</summary>
    public static IReadOnlyList<CalendarEvent> ParseEvents(string text)
    {
        var events = new List<CalendarEvent>();
        var lines = Unfold(text);

        var inEvent = false;
        var fields = new Dictionary<string, (string Value, string Param)>(StringComparer.OrdinalIgnoreCase);
        foreach (var line in lines)
        {
            if (line.Equals("BEGIN:VEVENT", StringComparison.OrdinalIgnoreCase))
            {
                inEvent = true;
                fields.Clear();
                continue;
            }

            if (line.Equals("END:VEVENT", StringComparison.OrdinalIgnoreCase))
            {
                inEvent = false;
                var parsed = BuildEvent(fields);
                if (parsed is not null)
                {
                    events.Add(parsed);
                }

                continue;
            }

            if (!inEvent)
            {
                continue;
            }

            var colon = line.IndexOf(':', StringComparison.Ordinal);
            if (colon < 0)
            {
                continue;
            }

            var nameAndParams = line[..colon];
            var value = line[(colon + 1)..];
            var semicolon = nameAndParams.IndexOf(';', StringComparison.Ordinal);
            var name = semicolon < 0 ? nameAndParams : nameAndParams[..semicolon];
            var param = semicolon < 0 ? "" : nameAndParams[(semicolon + 1)..];
            fields[name] = (value, param);
        }

        return events;
    }

    private static CalendarEvent? BuildEvent(IReadOnlyDictionary<string, (string Value, string Param)> fields)
    {
        if (!fields.TryGetValue("UID", out var uid)
            || !fields.TryGetValue("DTSTART", out var dtStart)
            || !fields.TryGetValue("DTEND", out var dtEnd))
        {
            return null;
        }

        var allDay = dtStart.Param.Contains("VALUE=DATE", StringComparison.OrdinalIgnoreCase);
        var title = fields.TryGetValue("SUMMARY", out var summary) ? Unescape(summary.Value) : "";
        var location = fields.TryGetValue("LOCATION", out var loc) ? Unescape(loc.Value) : null;
        var description = fields.TryGetValue("DESCRIPTION", out var desc) ? Unescape(desc.Value) : null;

        return new CalendarEvent(
            uid.Value,
            title,
            ParseDate(dtStart.Value, allDay),
            ParseDate(dtEnd.Value, allDay),
            allDay,
            location,
            description);
    }

    private static string FormatTimed(DateTimeOffset value) =>
        value.ToUniversalTime().ToString(DateTimeFormat, CultureInfo.InvariantCulture) + "Z";

    private static DateTimeOffset ParseDate(string value, bool allDay)
    {
        if (allDay)
        {
            var date = DateTime.ParseExact(value, DateFormat, CultureInfo.InvariantCulture, DateTimeStyles.None);
            return new DateTimeOffset(date.Year, date.Month, date.Day, 0, 0, 0, TimeSpan.Zero);
        }

        var trimmed = value.EndsWith('Z') ? value[..^1] : value;
        var dt = DateTime.ParseExact(trimmed, DateTimeFormat, CultureInfo.InvariantCulture, DateTimeStyles.None);
        return new DateTimeOffset(dt, TimeSpan.Zero);
    }

    // RFC 5545 line unfolding: a CRLF followed by a space or tab continues the previous line.
    private static List<string> Unfold(string text)
    {
        var raw = text.Replace("\r\n", "\n", StringComparison.Ordinal).Split('\n');
        var unfolded = new List<string>(raw.Length);
        foreach (var line in raw)
        {
            if ((line.StartsWith(' ') || line.StartsWith('\t')) && unfolded.Count > 0)
            {
                unfolded[^1] += line[1..];
            }
            else if (line.Length > 0)
            {
                unfolded.Add(line);
            }
        }

        return unfolded;
    }

    private static string Escape(string value) => value
        .Replace("\\", "\\\\", StringComparison.Ordinal)
        .Replace(";", "\\;", StringComparison.Ordinal)
        .Replace(",", "\\,", StringComparison.Ordinal)
        .Replace("\r\n", "\\n", StringComparison.Ordinal)
        .Replace("\n", "\\n", StringComparison.Ordinal);

    private static string Unescape(string value)
    {
        var sb = new StringBuilder(value.Length);
        for (var i = 0; i < value.Length; i++)
        {
            if (value[i] == '\\' && i + 1 < value.Length)
            {
                var next = value[++i];
                sb.Append(next switch
                {
                    'n' or 'N' => "\n",
                    _ => next.ToString(),
                });
            }
            else
            {
                sb.Append(value[i]);
            }
        }

        return sb.ToString();
    }
}
