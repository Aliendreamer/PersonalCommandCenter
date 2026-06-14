namespace Pcc.Plugins.Calendar;

/// <summary>Bound from the plugin's config section (<c>Plugins:Calendar</c>).</summary>
public sealed class CalendarOptions
{
    /// <summary>CalDAV server base URL (e.g. <c>http://radicale:5232</c>).</summary>
    public string BaseUrl { get; set; } = "";

    /// <summary>Collection path on the server (e.g. <c>/pcc/calendar/</c>).</summary>
    public string Collection { get; set; } = "/pcc/calendar/";

    public string Username { get; set; } = "";

    public string Password { get; set; } = "";

    /// <summary>How many days ahead the default listing window spans.</summary>
    public int WindowDays { get; set; } = 7;
}
