namespace Pcc.Plugins.Calendar;

/// <summary>Bound from the plugin's config section (<c>Plugins:Calendar</c>).</summary>
public sealed class CalendarOptions
{
    /// <summary>CalDAV server base URL; defaults to the compose-network Radicale.</summary>
    public string BaseUrl { get; set; } = "http://radicale:5232";

    /// <summary>Collection path on the server (e.g. <c>/pcc/calendar/</c>).</summary>
    public string Collection { get; set; } = "/pcc/calendar/";

    public string Username { get; set; } = "";

    public string Password { get; set; } = "";

    /// <summary>How many days ahead the default listing window spans.</summary>
    public int WindowDays { get; set; } = 7;

    /// <summary>Optional Google Calendar backend (read+write the user's primary calendar).</summary>
    public GoogleCalendarOptions Google { get; set; } = new();
}

/// <summary>
/// Google Calendar backend config (bound from <c>Plugins:Calendar:Google</c>). Credentials are
/// supplied via config (secrets in <c>.env</c>) — there is no in-app OAuth flow. The refresh token is
/// exchanged for short-lived access tokens. Inert unless <see cref="Enabled"/> and all secrets are set.
/// </summary>
public sealed class GoogleCalendarOptions
{
    public bool Enabled { get; set; }

    public string ClientId { get; set; } = "";

    public string ClientSecret { get; set; } = "";

    /// <summary>A long-lived OAuth refresh token with the Calendar scope, obtained once externally.</summary>
    public string RefreshToken { get; set; } = "";

    /// <summary>True only when enabled and every credential is present.</summary>
    public bool IsConfigured =>
        Enabled
        && !string.IsNullOrEmpty(ClientId)
        && !string.IsNullOrEmpty(ClientSecret)
        && !string.IsNullOrEmpty(RefreshToken);
}
