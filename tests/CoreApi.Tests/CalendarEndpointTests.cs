using System.Net;
using System.Net.Http.Json;
using CoreApi.Tests.Auth;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Pcc.Plugins.Calendar;

namespace CoreApi.Tests;

public class CalendarEndpointTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory = factory;

    private static CalendarEvent Sample(string uid = "e1") => new(
        uid, "Standup",
        new DateTimeOffset(2026, 6, 15, 9, 0, 0, TimeSpan.Zero),
        new DateTimeOffset(2026, 6, 15, 9, 30, 0, TimeSpan.Zero),
        false, null, null);

    [Fact]
    public async Task Lists_events_when_enabled_and_authenticated()
    {
        var client = AuthedWith(new FakeCalendar([Sample()]));

        var result = await client.GetFromJsonAsync<List<EventDto>>("/api/calendar/events");

        Assert.NotNull(result);
        Assert.Contains(result, e => e.Uid == "e1" && e.Title == "Standup");
    }

    [Fact]
    public async Task Honors_an_explicit_from_to_range_for_past_events()
    {
        var now = DateTimeOffset.UtcNow;
        var past = new CalendarEvent("p1", "Past", now.AddDays(-2), now.AddDays(-2), false, null, null);
        var future = new CalendarEvent("f1", "Future", now.AddDays(1), now.AddDays(1), false, null, null);
        var client = AuthedWith(new RangeCalendar([past, future]));

        var defaultWindow = await client.GetFromJsonAsync<List<EventDto>>("/api/calendar/events");
        var fromIso = Uri.EscapeDataString(now.AddDays(-3).ToString("o"));
        var toIso = Uri.EscapeDataString(now.AddDays(2).ToString("o"));
        var ranged = await client.GetFromJsonAsync<List<EventDto>>($"/api/calendar/events?from={fromIso}&to={toIso}");

        Assert.DoesNotContain(defaultWindow!, e => e.Uid == "p1"); // past excluded by the default forward window
        Assert.Contains(ranged!, e => e.Uid == "p1"); // explicit range reaches back to include it
        Assert.Contains(ranged!, e => e.Uid == "f1");
    }

    [Fact]
    public async Task Requires_authentication()
    {
        var response = await _factory.CreateClient().GetAsync("/api/calendar/events");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Returns_502_when_caldav_fails()
    {
        var client = AuthedWith(new ThrowingCalendar());
        var response = await client.GetAsync("/api/calendar/events");
        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
    }

    [Fact]
    public async Task Creates_an_event_and_lists_it()
    {
        var store = new FakeCalendar([]);
        var client = AuthedWith(store);

        var create = await client.PostAsJsonAsync("/api/calendar/events", new
        {
            title = "Lunch",
            start = "2026-06-15T12:00:00+00:00",
            end = "2026-06-15T13:00:00+00:00",
        });

        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var created = await create.Content.ReadFromJsonAsync<EventDto>();
        Assert.NotNull(created);
        Assert.False(string.IsNullOrEmpty(created!.Uid));

        var list = await client.GetFromJsonAsync<List<EventDto>>("/api/calendar/events");
        Assert.Contains(list!, e => e.Title == "Lunch");
    }

    [Fact]
    public async Task Rejects_an_event_whose_end_precedes_start()
    {
        var client = AuthedWith(new FakeCalendar([]));

        var response = await client.PostAsJsonAsync("/api/calendar/events", new
        {
            title = "Backwards",
            start = "2026-06-15T13:00:00+00:00",
            end = "2026-06-15T12:00:00+00:00",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Updates_an_existing_event_and_404s_unknown()
    {
        var client = AuthedWith(new FakeCalendar([Sample("u1")]));

        var ok = await client.PutAsJsonAsync("/api/calendar/events/u1", new
        {
            title = "Renamed",
            start = "2026-06-15T09:00:00+00:00",
            end = "2026-06-15T09:30:00+00:00",
        });
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);

        var missing = await client.PutAsJsonAsync("/api/calendar/events/nope", new
        {
            title = "X",
            start = "2026-06-15T09:00:00+00:00",
            end = "2026-06-15T09:30:00+00:00",
        });
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
    }

    [Fact]
    public async Task Deletes_an_existing_event_and_404s_unknown()
    {
        var client = AuthedWith(new FakeCalendar([Sample("d1")]));

        var ok = await client.DeleteAsync("/api/calendar/events/d1");
        Assert.Equal(HttpStatusCode.NoContent, ok.StatusCode);

        var missing = await client.DeleteAsync("/api/calendar/events/d1");
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
    }

    [Fact]
    public async Task Absent_when_disabled()
    {
        Environment.SetEnvironmentVariable("Plugins__Calendar__Enabled", "false");
        try
        {
            await using var factory = new WebApplicationFactory<Program>();
            var client = factory.AuthedClient();

            var eventsResponse = await client.GetAsync("/api/calendar/events");
            var plugins = await client.GetFromJsonAsync<List<PluginDto>>("/api/plugins");

            Assert.Equal(HttpStatusCode.NotFound, eventsResponse.StatusCode);
            Assert.NotNull(plugins);
            Assert.DoesNotContain(plugins!, p => p.Id == "calendar");
        }
        finally
        {
            Environment.SetEnvironmentVariable("Plugins__Calendar__Enabled", null);
        }
    }

    private HttpClient AuthedWith(ICalendarClient calendar)
    {
        var client = _factory.Authed(s => s.AddSingleton(calendar)).CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.Header, "1");
        return client;
    }

    private sealed record EventDto(string Uid, string Title, DateTimeOffset Start, DateTimeOffset End, bool AllDay);

    private sealed record PluginDto(string Id);

    private sealed class FakeCalendar(IEnumerable<CalendarEvent> seed) : ICalendarClient
    {
        private readonly List<CalendarEvent> _events = [.. seed];

        public Task<IReadOnlyList<CalendarEvent>> ListAsync(DateTimeOffset from, DateTimeOffset to, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<CalendarEvent>>(_events.ToList());

        public Task<CalendarEvent> CreateAsync(CalendarEventInput input, string target, CancellationToken ct = default)
        {
            var ev = new CalendarEvent(
                Guid.NewGuid().ToString("N"), input.Title, input.Start, input.End,
                input.AllDay, input.Location, input.Description);
            _events.Add(ev);
            return Task.FromResult(ev);
        }

        public Task<CalendarEvent?> UpdateAsync(string uid, CalendarEventInput input, string source, CancellationToken ct = default)
        {
            var index = _events.FindIndex(e => e.Uid == uid);
            if (index < 0)
            {
                return Task.FromResult<CalendarEvent?>(null);
            }

            var ev = new CalendarEvent(uid, input.Title, input.Start, input.End, input.AllDay, input.Location, input.Description);
            _events[index] = ev;
            return Task.FromResult<CalendarEvent?>(ev);
        }

        public Task<bool> DeleteAsync(string uid, string source, CancellationToken ct = default) =>
            Task.FromResult(_events.RemoveAll(e => e.Uid == uid) > 0);
    }

    // Filters by the requested range (unlike FakeCalendar) so range plumbing can be asserted.
    private sealed class RangeCalendar(IEnumerable<CalendarEvent> seed) : ICalendarClient
    {
        private readonly List<CalendarEvent> _events = [.. seed];

        public Task<IReadOnlyList<CalendarEvent>> ListAsync(DateTimeOffset from, DateTimeOffset to, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<CalendarEvent>>(
                _events.Where(e => e.Start >= from && e.Start < to).ToList());

        public Task<CalendarEvent> CreateAsync(CalendarEventInput input, string target, CancellationToken ct = default) =>
            throw new NotSupportedException();

        public Task<CalendarEvent?> UpdateAsync(string uid, CalendarEventInput input, string source, CancellationToken ct = default) =>
            throw new NotSupportedException();

        public Task<bool> DeleteAsync(string uid, string source, CancellationToken ct = default) =>
            throw new NotSupportedException();
    }

    private sealed class ThrowingCalendar : ICalendarClient
    {
        public Task<IReadOnlyList<CalendarEvent>> ListAsync(DateTimeOffset from, DateTimeOffset to, CancellationToken ct = default) =>
            throw new HttpRequestException("CalDAV unreachable");

        public Task<CalendarEvent> CreateAsync(CalendarEventInput input, string target, CancellationToken ct = default) =>
            throw new HttpRequestException("CalDAV unreachable");

        public Task<CalendarEvent?> UpdateAsync(string uid, CalendarEventInput input, string source, CancellationToken ct = default) =>
            throw new HttpRequestException("CalDAV unreachable");

        public Task<bool> DeleteAsync(string uid, string source, CancellationToken ct = default) =>
            throw new HttpRequestException("CalDAV unreachable");
    }
}
