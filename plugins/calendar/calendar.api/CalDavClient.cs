using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Xml.Linq;
using Microsoft.Extensions.Options;

namespace Pcc.Plugins.Calendar;

/// <summary>Talks CalDAV to the configured collection (e.g. Radicale) and maps VEVENTs.</summary>
public sealed class CalDavClient : ICalendarClient
{
    private static readonly XNamespace Caldav = "urn:ietf:params:xml:ns:caldav";
    private static readonly HttpMethod Report = new("REPORT");
    private static readonly HttpMethod MkCalendar = new("MKCALENDAR");

    private readonly HttpClient _http;
    private readonly CalendarOptions _options;

    public CalDavClient(HttpClient http, IOptions<CalendarOptions> options)
    {
        _http = http;
        _options = options.Value;
        if (string.IsNullOrEmpty(_options.BaseUrl))
        {
            throw new InvalidOperationException("Calendar:BaseUrl is not configured.");
        }

        var credentials = Convert.ToBase64String(
            Encoding.UTF8.GetBytes($"{_options.Username}:{_options.Password}"));
        _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", credentials);
    }

    private Uri CollectionUri => new($"{_options.BaseUrl.TrimEnd('/')}/{_options.Collection.Trim('/')}/");

    private Uri EventUri(string uid) => new(CollectionUri, $"{uid}.ics");

    public async Task<IReadOnlyList<CalendarEvent>> ListAsync(TimeSpan window, CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;
        var until = now + window;
        var start = now.UtcDateTime.ToString("yyyyMMdd'T'HHmmss'Z'", CultureInfo.InvariantCulture);
        var end = until.UtcDateTime.ToString("yyyyMMdd'T'HHmmss'Z'", CultureInfo.InvariantCulture);
        var body = $"""
            <?xml version="1.0" encoding="utf-8"?>
            <c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
              <d:prop><d:getetag/><c:calendar-data/></d:prop>
              <c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT">
                <c:time-range start="{start}" end="{end}"/>
              </c:comp-filter></c:comp-filter></c:filter>
            </c:calendar-query>
            """;

        using var request = new HttpRequestMessage(Report, CollectionUri)
        {
            Content = new StringContent(body, Encoding.UTF8, "application/xml"),
        };
        request.Headers.Add("Depth", "1");

        using var response = await _http.SendAsync(request, cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return []; // collection not created yet — no events
        }

        response.EnsureSuccessStatusCode();
        var xml = await response.Content.ReadAsStringAsync(cancellationToken);

        var events = ParseMultistatus(xml)
            .Where(e => e.Start >= now && e.Start < until)
            .OrderBy(e => e.Start)
            .ToList();
        return events;
    }

    public async Task<CalendarEvent> CreateAsync(CalendarEventInput input, CancellationToken cancellationToken = default)
    {
        await EnsureCollectionAsync(cancellationToken);
        var uid = Guid.NewGuid().ToString("N");
        await PutAsync(uid, input, cancellationToken);
        return ToEvent(uid, input);
    }

    public async Task<CalendarEvent?> UpdateAsync(string uid, CalendarEventInput input, CancellationToken cancellationToken = default)
    {
        using var head = new HttpRequestMessage(HttpMethod.Head, EventUri(uid));
        using var headResponse = await _http.SendAsync(head, cancellationToken);
        if (headResponse.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }

        await PutAsync(uid, input, cancellationToken);
        return ToEvent(uid, input);
    }

    public async Task<bool> DeleteAsync(string uid, CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Delete, EventUri(uid));
        using var response = await _http.SendAsync(request, cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return false;
        }

        response.EnsureSuccessStatusCode();
        return true;
    }

    private async Task PutAsync(string uid, CalendarEventInput input, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Put, EventUri(uid))
        {
            Content = new StringContent(CalendarIcs.Serialize(uid, input), Encoding.UTF8, "text/calendar"),
        };
        using var response = await _http.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    private async Task EnsureCollectionAsync(CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(MkCalendar, CollectionUri);
        using var response = await _http.SendAsync(request, cancellationToken);
        // The collection already exists when MKCALENDAR is rejected with 405 (Method Not Allowed,
        // per RFC 4791) or 409 (Conflict, as Radicale reports it); both are fine. Anything else
        // non-2xx is a real failure.
        if (response.StatusCode != HttpStatusCode.MethodNotAllowed
            && response.StatusCode != HttpStatusCode.Conflict
            && !response.IsSuccessStatusCode)
        {
            response.EnsureSuccessStatusCode();
        }
    }

    private static IEnumerable<CalendarEvent> ParseMultistatus(string xml)
    {
        XDocument doc;
        try
        {
            doc = XDocument.Parse(xml);
        }
        catch (System.Xml.XmlException)
        {
            return [];
        }

        return doc.Descendants(Caldav + "calendar-data")
            .SelectMany(node => CalendarIcs.ParseEvents(node.Value));
    }

    private static CalendarEvent ToEvent(string uid, CalendarEventInput input) =>
        new(uid, input.Title, input.Start, input.End, input.AllDay, input.Location, input.Description);
}
