using System.Globalization;
using System.Text;

namespace Pcc.Plugins.Tasks;

/// <summary>
/// Minimal iCalendar (RFC 5545) VTODO serialize/parse for the v1 subset: UID, SUMMARY, optional DUE
/// (all-day <c>VALUE=DATE</c> or UTC-timed), STATUS (NEEDS-ACTION/COMPLETED) with COMPLETED stamp +
/// PERCENT-COMPLETE, and DESCRIPTION — with text escaping and line unfolding. Mirrors the calendar
/// plugin's hand-rolled CalendarIcs (no Ical.Net). No recurrence/alarms/timezones (v1 non-goals).
/// </summary>
public static class TaskIcs
{
    private const string DateFormat = "yyyyMMdd";
    private const string DateTimeFormat = "yyyyMMdd'T'HHmmss";

    /// <summary>Serializes one to-do as a complete VCALENDAR (the body of a CalDAV <c>PUT</c>).</summary>
    public static string Serialize(string uid, TodoInput input)
    {
        var sb = new StringBuilder();
        sb.Append("BEGIN:VCALENDAR\r\n");
        sb.Append("VERSION:2.0\r\n");
        sb.Append("PRODID:-//PCC//tasks//EN\r\n");
        sb.Append("BEGIN:VTODO\r\n");
        sb.Append("UID:").Append(uid).Append("\r\n");
        sb.Append("DTSTAMP:").Append(FormatTimed(DateTimeOffset.UtcNow)).Append("\r\n");
        sb.Append("SUMMARY:").Append(Escape(input.Title)).Append("\r\n");

        if (input.Due is { } due)
        {
            sb.Append("DUE:").Append(FormatTimed(due)).Append("\r\n");
        }

        if (input.Completed)
        {
            sb.Append("STATUS:COMPLETED\r\n");
            sb.Append("PERCENT-COMPLETE:100\r\n");
            sb.Append("COMPLETED:").Append(FormatTimed(DateTimeOffset.UtcNow)).Append("\r\n");
        }
        else
        {
            sb.Append("STATUS:NEEDS-ACTION\r\n");
        }

        if (!string.IsNullOrEmpty(input.Description))
        {
            sb.Append("DESCRIPTION:").Append(Escape(input.Description)).Append("\r\n");
        }

        sb.Append("END:VTODO\r\n");
        sb.Append("END:VCALENDAR\r\n");
        return sb.ToString();
    }

    /// <summary>Parses every VTODO found in an iCalendar text (a VCALENDAR or a calendar-data fragment).</summary>
    public static IReadOnlyList<TodoItem> ParseTodos(string text)
    {
        var todos = new List<TodoItem>();
        var lines = Unfold(text);

        var inTodo = false;
        var fields = new Dictionary<string, (string Value, string Param)>(StringComparer.OrdinalIgnoreCase);
        foreach (var line in lines)
        {
            if (line.Equals("BEGIN:VTODO", StringComparison.OrdinalIgnoreCase))
            {
                inTodo = true;
                fields.Clear();
                continue;
            }

            if (line.Equals("END:VTODO", StringComparison.OrdinalIgnoreCase))
            {
                inTodo = false;
                var parsed = BuildTodo(fields);
                if (parsed is not null)
                {
                    todos.Add(parsed);
                }

                continue;
            }

            if (!inTodo)
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

        return todos;
    }

    private static TodoItem? BuildTodo(IReadOnlyDictionary<string, (string Value, string Param)> fields)
    {
        if (!fields.TryGetValue("UID", out var uid))
        {
            return null;
        }

        var title = fields.TryGetValue("SUMMARY", out var summary) ? Unescape(summary.Value) : "";
        var description = fields.TryGetValue("DESCRIPTION", out var desc) ? Unescape(desc.Value) : null;
        var completed = fields.TryGetValue("STATUS", out var status)
            && status.Value.Equals("COMPLETED", StringComparison.OrdinalIgnoreCase);

        DateTimeOffset? due = null;
        if (fields.TryGetValue("DUE", out var dueField))
        {
            var allDay = dueField.Param.Contains("VALUE=DATE", StringComparison.OrdinalIgnoreCase);
            due = ParseDate(dueField.Value, allDay);
        }

        return new TodoItem(uid.Value, title, due, completed, description);
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
