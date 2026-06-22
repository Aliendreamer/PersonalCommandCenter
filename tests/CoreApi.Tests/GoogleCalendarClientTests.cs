using System.Net;
using Microsoft.Extensions.Options;
using Pcc.Plugins.Calendar;

namespace CoreApi.Tests;

public class GoogleCalendarClientTests
{
    private const string TokenJson = """{"access_token":"AT-123","expires_in":3600}""";

    private const string ListJson = """
        {
          "items": [
            { "id": "g1", "summary": "Standup", "location": "Room 1",
              "start": { "dateTime": "2026-07-02T09:00:00Z" }, "end": { "dateTime": "2026-07-02T09:30:00Z" } },
            { "id": "g2", "summary": "Holiday",
              "start": { "date": "2026-07-04" }, "end": { "date": "2026-07-05" } }
          ]
        }
        """;

    [Fact]
    public async Task List_exchanges_the_refresh_token_then_reads_primary_events()
    {
        var handler = new RoutingStub();
        var client = Create(handler);

        var events = await client.ListAsync(
            new DateTimeOffset(2026, 7, 1, 0, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 8, 1, 0, 0, 0, TimeSpan.Zero));

        // A token exchange happened first, then the events read with the bearer + singleEvents.
        var token = handler.Requests.First(r => r.RequestUri!.AbsoluteUri.Contains("oauth2.googleapis.com/token", StringComparison.Ordinal));
        Assert.Equal(HttpMethod.Post, token.Method);
        var list = handler.Requests.First(r => r.RequestUri!.AbsoluteUri.Contains("/calendars/primary/events", StringComparison.Ordinal));
        Assert.Equal("Bearer AT-123", list.Headers.Authorization?.ToString());
        Assert.Contains("singleEvents=true", list.RequestUri!.AbsoluteUri, StringComparison.Ordinal);

        Assert.Equal(2, events.Count);
        Assert.All(events, e => Assert.Equal("google", e.Source));
    }

    [Fact]
    public async Task List_maps_timed_and_all_day_events()
    {
        var client = Create(new RoutingStub());

        var events = await client.ListAsync(
            new DateTimeOffset(2026, 7, 1, 0, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 8, 1, 0, 0, 0, TimeSpan.Zero));

        var standup = events.Single(e => e.Uid == "g1");
        Assert.Equal("Standup", standup.Title);
        Assert.False(standup.AllDay);
        Assert.Equal(new DateTimeOffset(2026, 7, 2, 9, 0, 0, TimeSpan.Zero), standup.Start);
        Assert.Equal("Room 1", standup.Location);

        var holiday = events.Single(e => e.Uid == "g2");
        Assert.True(holiday.AllDay);
        Assert.Equal(new DateTimeOffset(2026, 7, 4, 0, 0, 0, TimeSpan.Zero), holiday.Start);
    }

    [Fact]
    public async Task Create_posts_to_the_events_endpoint_and_maps_the_result()
    {
        var handler = new RoutingStub();
        var client = Create(handler);

        var created = await client.CreateAsync(new CalendarEventInput(
            "New", new DateTimeOffset(2026, 7, 2, 9, 0, 0, TimeSpan.Zero), new DateTimeOffset(2026, 7, 2, 10, 0, 0, TimeSpan.Zero)));

        var post = handler.Requests.Single(r =>
            r.Method == HttpMethod.Post && r.RequestUri!.AbsoluteUri.Contains("/calendars/primary/events", StringComparison.Ordinal));
        Assert.NotNull(post);
        Assert.Equal("google", created.Source);
        Assert.Equal("g1", created.Uid); // the stub echoes a created event
    }

    [Fact]
    public async Task Update_returns_null_on_404()
    {
        var client = Create(new RoutingStub { EventsStatus = HttpStatusCode.NotFound });

        var result = await client.UpdateAsync("missing", new CalendarEventInput(
            "x", DateTimeOffset.UtcNow, DateTimeOffset.UtcNow.AddHours(1)));

        Assert.Null(result);
    }

    [Fact]
    public async Task Delete_returns_false_on_404()
    {
        var client = Create(new RoutingStub { EventsStatus = HttpStatusCode.NotFound });

        Assert.False(await client.DeleteAsync("missing"));
    }

    private static GoogleCalendarClient Create(RoutingStub handler) =>
        new(new HttpClient(handler), Options.Create(new CalendarOptions
        {
            Google = new GoogleCalendarOptions
            {
                Enabled = true,
                ClientId = "client",
                ClientSecret = "secret",
                RefreshToken = "refresh",
            },
        }));

    private sealed class RoutingStub : HttpMessageHandler
    {
        public List<HttpRequestMessage> Requests { get; } = [];

        /// <summary>Status returned for events-endpoint calls (e.g. 404 to test not-found).</summary>
        public HttpStatusCode EventsStatus { get; init; } = HttpStatusCode.OK;

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Requests.Add(request);
            var url = request.RequestUri!.AbsoluteUri;

            if (url.Contains("oauth2.googleapis.com/token", StringComparison.Ordinal))
            {
                return Json(HttpStatusCode.OK, TokenJson);
            }

            if (EventsStatus != HttpStatusCode.OK)
            {
                return Task.FromResult(new HttpResponseMessage(EventsStatus));
            }

            // GET list → the two events; POST/PATCH → a single created/updated event; DELETE → 200.
            if (request.Method == HttpMethod.Get)
            {
                return Json(HttpStatusCode.OK, ListJson);
            }

            if (request.Method == HttpMethod.Delete)
            {
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NoContent));
            }

            return Json(HttpStatusCode.OK,
                """{ "id": "g1", "summary": "New", "start": { "dateTime": "2026-07-02T09:00:00Z" }, "end": { "dateTime": "2026-07-02T10:00:00Z" } }""");
        }

        private static Task<HttpResponseMessage> Json(HttpStatusCode status, string body) =>
            Task.FromResult(new HttpResponseMessage(status)
            {
                Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json"),
            });
    }
}
