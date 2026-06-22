using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace Pcc.Plugins.Calendar;

/// <summary>
/// Reads and writes the user's <c>primary</c> Google Calendar. Credentials come from config (no in-app
/// OAuth flow): a long-lived refresh token is exchanged for short-lived access tokens (cached until just
/// before expiry). Recurring events are read <c>singleEvents=true</c> so they arrive pre-expanded as
/// instances — no RRULE handling needed. Writes create single (non-recurring) events.
/// </summary>
public sealed class GoogleCalendarClient(HttpClient http, IOptions<CalendarOptions> options) : ICalendarSourceClient
{
    private const string TokenEndpoint = "https://oauth2.googleapis.com/token";
    private const string EventsEndpoint = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private readonly GoogleCalendarOptions _options = options.Value.Google;
    private (string Token, DateTimeOffset Expiry)? _cachedToken;

    public string Source => "google";

    public async Task<IReadOnlyList<CalendarEvent>> ListAsync(DateTimeOffset from, DateTimeOffset to, CancellationToken cancellationToken = default)
    {
        var url = $"{EventsEndpoint}?singleEvents=true&orderBy=startTime"
            + $"&timeMin={Uri.EscapeDataString(from.ToString("o", CultureInfo.InvariantCulture))}"
            + $"&timeMax={Uri.EscapeDataString(to.ToString("o", CultureInfo.InvariantCulture))}";
        using var response = await SendAsync(HttpMethod.Get, url, null, cancellationToken);
        response.EnsureSuccessStatusCode();
        var page = await response.Content.ReadFromJsonAsync<EventListDto>(Json, cancellationToken);
        return (page?.Items ?? [])
            .Select(ToEvent)
            .Where(e => e is not null)
            .Select(e => e!)
            .ToList();
    }

    public async Task<CalendarEvent> CreateAsync(CalendarEventInput input, CancellationToken cancellationToken = default)
    {
        using var response = await SendAsync(HttpMethod.Post, EventsEndpoint, ToDto(input), cancellationToken);
        response.EnsureSuccessStatusCode();
        var created = await response.Content.ReadFromJsonAsync<EventDto>(Json, cancellationToken);
        return ToEvent(created!)!;
    }

    public async Task<CalendarEvent?> UpdateAsync(string uid, CalendarEventInput input, CancellationToken cancellationToken = default)
    {
        using var response = await SendAsync(HttpMethod.Patch, $"{EventsEndpoint}/{Uri.EscapeDataString(uid)}", ToDto(input), cancellationToken);
        if (response.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.Gone)
        {
            return null;
        }

        response.EnsureSuccessStatusCode();
        var updated = await response.Content.ReadFromJsonAsync<EventDto>(Json, cancellationToken);
        return ToEvent(updated!)!;
    }

    public async Task<bool> DeleteAsync(string uid, CancellationToken cancellationToken = default)
    {
        using var response = await SendAsync(HttpMethod.Delete, $"{EventsEndpoint}/{Uri.EscapeDataString(uid)}", null, cancellationToken);
        if (response.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.Gone)
        {
            return false;
        }

        response.EnsureSuccessStatusCode();
        return true;
    }

    private async Task<HttpResponseMessage> SendAsync(HttpMethod method, string url, object? body, CancellationToken cancellationToken)
    {
        var token = await AccessTokenAsync(cancellationToken);
        using var request = new HttpRequestMessage(method, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        if (body is not null)
        {
            request.Content = JsonContent.Create(body, options: Json);
        }

        return await http.SendAsync(request, cancellationToken);
    }

    private async Task<string> AccessTokenAsync(CancellationToken cancellationToken)
    {
        if (_cachedToken is { } cached && cached.Expiry > DateTimeOffset.UtcNow.AddSeconds(60))
        {
            return cached.Token;
        }

        using var response = await http.PostAsync(TokenEndpoint, new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["client_id"] = _options.ClientId,
            ["client_secret"] = _options.ClientSecret,
            ["refresh_token"] = _options.RefreshToken,
            ["grant_type"] = "refresh_token",
        }), cancellationToken);
        response.EnsureSuccessStatusCode();
        var token = await response.Content.ReadFromJsonAsync<TokenDto>(Json, cancellationToken)
            ?? throw new InvalidOperationException("Empty token response from Google.");
        _cachedToken = (token.AccessToken, DateTimeOffset.UtcNow.AddSeconds(token.ExpiresIn));
        return token.AccessToken;
    }

    private static CalendarEvent? ToEvent(EventDto dto)
    {
        if (dto.Id is null || dto.Start is null || dto.End is null)
        {
            return null;
        }

        var allDay = dto.Start.Date is not null;
        if (!TryParseEnd(dto.Start, out var start) || !TryParseEnd(dto.End, out var end))
        {
            return null;
        }

        return new CalendarEvent(dto.Id, dto.Summary ?? "", start, end, allDay, dto.Location, dto.Description, "google");
    }

    private static bool TryParseEnd(TimeDto time, out DateTimeOffset result)
    {
        if (time.DateTime is { } dt && DateTimeOffset.TryParse(dt, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out result))
        {
            return true;
        }

        if (time.Date is { } d && DateOnly.TryParse(d, CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
        {
            result = new DateTimeOffset(date.Year, date.Month, date.Day, 0, 0, 0, TimeSpan.Zero);
            return true;
        }

        result = default;
        return false;
    }

    private static EventDto ToDto(CalendarEventInput input) => new()
    {
        Summary = input.Title,
        Location = input.Location,
        Description = input.Description,
        Start = input.AllDay
            ? new TimeDto { Date = input.Start.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) }
            : new TimeDto { DateTime = input.Start.ToString("o", CultureInfo.InvariantCulture) },
        End = input.AllDay
            ? new TimeDto { Date = input.End.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) }
            : new TimeDto { DateTime = input.End.ToString("o", CultureInfo.InvariantCulture) },
    };

    private sealed record TokenDto(
        [property: JsonPropertyName("access_token")] string AccessToken,
        [property: JsonPropertyName("expires_in")] int ExpiresIn);

    private sealed class EventListDto
    {
        public List<EventDto>? Items { get; set; }
    }

    private sealed class EventDto
    {
        public string? Id { get; set; }

        public string? Summary { get; set; }

        public string? Location { get; set; }

        public string? Description { get; set; }

        public TimeDto? Start { get; set; }

        public TimeDto? End { get; set; }
    }

    private sealed class TimeDto
    {
        public string? DateTime { get; set; }

        public string? Date { get; set; }
    }
}
