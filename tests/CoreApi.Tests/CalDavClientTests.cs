using System.Globalization;
using System.Net;
using Pcc.Plugins.Calendar;

namespace CoreApi.Tests;

public class CalDavClientTests
{
    private static CalendarOptions Options() => new()
    {
        BaseUrl = "http://radicale.test:5232",
        Collection = "/pcc/calendar/",
        Username = "pcc",
        Password = "secret",
        WindowDays = 7,
    };

    [Fact]
    public async Task List_issues_a_report_with_basic_auth_and_depth_and_returns_in_window_events()
    {
        var soon = DateTimeOffset.UtcNow.AddHours(1).ToString("yyyyMMdd'T'HHmmss'Z'", CultureInfo.InvariantCulture);
        var past = DateTimeOffset.UtcNow.AddDays(-2).ToString("yyyyMMdd'T'HHmmss'Z'", CultureInfo.InvariantCulture);
        var multistatus = $"""
            <multistatus xmlns="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
              <response><propstat><prop><c:calendar-data>BEGIN:VCALENDAR
            BEGIN:VEVENT
            UID:soon
            SUMMARY:Soon
            DTSTART:{soon}
            DTEND:{soon}
            END:VEVENT
            END:VCALENDAR</c:calendar-data></prop></propstat></response>
              <response><propstat><prop><c:calendar-data>BEGIN:VCALENDAR
            BEGIN:VEVENT
            UID:past
            SUMMARY:Past
            DTSTART:{past}
            DTEND:{past}
            END:VEVENT
            END:VCALENDAR</c:calendar-data></prop></propstat></response>
            </multistatus>
            """;
        var handler = new StubHandler((req, _) =>
            new HttpResponseMessage((HttpStatusCode)207) { Content = new StringContent(multistatus) });
        var client = new CalDavClient(new HttpClient(handler), Microsoft.Extensions.Options.Options.Create(Options()));

        var now = DateTimeOffset.UtcNow;
        var events = await client.ListAsync(now, now.AddDays(7));

        var report = Assert.Single(handler.Requests, r => r.Method.Method == "REPORT");
        Assert.Equal("http://radicale.test:5232/pcc/calendar/", report.Uri);
        Assert.Equal("Basic", report.AuthScheme);
        Assert.Equal("1", report.Depth);
        Assert.Equal("soon", Assert.Single(events).Uid); // past event filtered out of the window
    }

    [Fact]
    public async Task List_with_an_explicit_past_range_returns_past_events()
    {
        var past = DateTimeOffset.UtcNow.AddDays(-2).ToString("yyyyMMdd'T'HHmmss'Z'", CultureInfo.InvariantCulture);
        var multistatus = $"""
            <multistatus xmlns="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
              <response><propstat><prop><c:calendar-data>BEGIN:VCALENDAR
            BEGIN:VEVENT
            UID:past
            SUMMARY:Past
            DTSTART:{past}
            DTEND:{past}
            END:VEVENT
            END:VCALENDAR</c:calendar-data></prop></propstat></response>
            </multistatus>
            """;
        var handler = new StubHandler((req, _) =>
            new HttpResponseMessage((HttpStatusCode)207) { Content = new StringContent(multistatus) });
        var client = new CalDavClient(new HttpClient(handler), Microsoft.Extensions.Options.Options.Create(Options()));

        var now = DateTimeOffset.UtcNow;
        var events = await client.ListAsync(now.AddDays(-3), now.AddDays(1));

        Assert.Equal("past", Assert.Single(events).Uid); // a range starting in the past includes it
    }

    [Fact]
    public async Task Create_ensures_the_collection_then_puts_the_ics()
    {
        var handler = new StubHandler((req, _) => new HttpResponseMessage(HttpStatusCode.Created));
        var client = new CalDavClient(new HttpClient(handler), Microsoft.Extensions.Options.Options.Create(Options()));

        var created = await client.CreateAsync(new CalendarEventInput(
            "Demo",
            new DateTimeOffset(2026, 6, 15, 9, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 6, 15, 10, 0, 0, TimeSpan.Zero)));

        Assert.False(string.IsNullOrEmpty(created.Uid));
        Assert.Contains(handler.Requests, r => r.Method.Method == "MKCALENDAR");
        var put = Assert.Single(handler.Requests, r => r.Method == HttpMethod.Put);
        Assert.EndsWith($"{created.Uid}.ics", put.Uri, StringComparison.Ordinal);
        Assert.Contains("SUMMARY:Demo", put.Body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Create_succeeds_when_the_collection_already_exists()
    {
        // Radicale answers MKCALENDAR on an existing collection with 409 Conflict; the PUT still 201s.
        var handler = new StubHandler((req, _) => new HttpResponseMessage(
            req.Method.Method == "MKCALENDAR" ? HttpStatusCode.Conflict : HttpStatusCode.Created));
        var client = new CalDavClient(new HttpClient(handler), Microsoft.Extensions.Options.Options.Create(Options()));

        var created = await client.CreateAsync(new CalendarEventInput(
            "Demo",
            new DateTimeOffset(2026, 6, 15, 9, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 6, 15, 10, 0, 0, TimeSpan.Zero)));

        Assert.False(string.IsNullOrEmpty(created.Uid));
        Assert.Contains(handler.Requests, r => r.Method == HttpMethod.Put);
    }

    [Fact]
    public async Task Delete_returns_false_on_404()
    {
        var handler = new StubHandler((req, _) => new HttpResponseMessage(HttpStatusCode.NotFound));
        var client = new CalDavClient(new HttpClient(handler), Microsoft.Extensions.Options.Options.Create(Options()));

        Assert.False(await client.DeleteAsync("nope"));
    }

    private sealed record Captured(HttpMethod Method, string Uri, string? AuthScheme, string? Depth, string Body);

    private sealed class StubHandler(Func<HttpRequestMessage, CancellationToken, HttpResponseMessage> respond)
        : HttpMessageHandler
    {
        public List<Captured> Requests { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            var body = request.Content is null ? "" : await request.Content.ReadAsStringAsync(cancellationToken);
            request.Headers.TryGetValues("Depth", out var depth);
            Requests.Add(new Captured(
                request.Method,
                request.RequestUri!.AbsoluteUri,
                request.Headers.Authorization?.Scheme,
                depth?.FirstOrDefault(),
                body));
            return respond(request, cancellationToken);
        }
    }
}
