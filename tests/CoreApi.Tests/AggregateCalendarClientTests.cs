using Pcc.Plugins.Calendar;

namespace CoreApi.Tests;

public class AggregateCalendarClientTests
{
    private static readonly DateTimeOffset From = new(2026, 7, 1, 0, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset To = new(2026, 8, 1, 0, 0, 0, TimeSpan.Zero);

    private static CalendarEvent Ev(string uid, int hour, string source) =>
        new(uid, uid, new DateTimeOffset(2026, 7, 2, hour, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 7, 2, hour + 1, 0, 0, TimeSpan.Zero), false, null, null, source);

    private static CalendarEventInput Input() =>
        new("e", new DateTimeOffset(2026, 7, 2, 9, 0, 0, TimeSpan.Zero), new DateTimeOffset(2026, 7, 2, 10, 0, 0, TimeSpan.Zero));

    [Fact]
    public async Task List_merges_sources_sorted_by_start_keeping_each_events_source()
    {
        var client = new AggregateCalendarClient([
            new FakeSource("pcc", [Ev("p", 10, "pcc")]),
            new FakeSource("google", [Ev("g", 9, "google")]),
        ]);

        var events = await client.ListAsync(From, To);

        Assert.Equal(["g", "p"], events.Select(e => e.Uid)); // sorted by start (09:00 before 10:00)
        Assert.Equal("google", events[0].Source);
        Assert.Equal("pcc", events[1].Source);
    }

    [Fact]
    public async Task List_degrades_when_one_source_fails()
    {
        var client = new AggregateCalendarClient([
            new FakeSource("pcc", throws: true),
            new FakeSource("google", [Ev("g", 9, "google")]),
        ]);

        var events = await client.ListAsync(From, To);

        Assert.Equal(["g"], events.Select(e => e.Uid)); // the failed source is dropped, not fatal
    }

    [Fact]
    public async Task List_throws_when_all_sources_fail()
    {
        var client = new AggregateCalendarClient([
            new FakeSource("pcc", throws: true),
            new FakeSource("google", throws: true),
        ]);

        await Assert.ThrowsAnyAsync<Exception>(() => client.ListAsync(From, To));
    }

    [Fact]
    public async Task Create_routes_to_the_target_source()
    {
        var pcc = new FakeSource("pcc");
        var google = new FakeSource("google");
        var client = new AggregateCalendarClient([pcc, google]);

        var created = await client.CreateAsync(Input(), "google");

        Assert.Equal("create", google.LastWrite);
        Assert.Null(pcc.LastWrite);
        Assert.Equal("google", created.Source);
    }

    [Fact]
    public async Task Update_and_delete_route_to_the_owning_source()
    {
        var pcc = new FakeSource("pcc");
        var google = new FakeSource("google");
        var client = new AggregateCalendarClient([pcc, google]);

        await client.UpdateAsync("u", Input(), "pcc");
        await client.DeleteAsync("d", "google");

        Assert.Equal("update", pcc.LastWrite);
        Assert.Equal("delete", google.LastWrite);
    }

    private sealed class FakeSource(string source, CalendarEvent[]? events = null, bool throws = false) : ICalendarSourceClient
    {
        public string Source => source;

        public string? LastWrite { get; private set; }

        public Task<IReadOnlyList<CalendarEvent>> ListAsync(DateTimeOffset from, DateTimeOffset to, CancellationToken ct = default) =>
            throws
                ? throw new HttpRequestException("source down")
                : Task.FromResult<IReadOnlyList<CalendarEvent>>(events ?? []);

        public Task<CalendarEvent> CreateAsync(CalendarEventInput input, CancellationToken ct = default)
        {
            LastWrite = "create";
            return Task.FromResult(new CalendarEvent("new", input.Title, input.Start, input.End, false, null, null, source));
        }

        public Task<CalendarEvent?> UpdateAsync(string uid, CalendarEventInput input, CancellationToken ct = default)
        {
            LastWrite = "update";
            return Task.FromResult<CalendarEvent?>(new CalendarEvent(uid, input.Title, input.Start, input.End, false, null, null, source));
        }

        public Task<bool> DeleteAsync(string uid, CancellationToken ct = default)
        {
            LastWrite = "delete";
            return Task.FromResult(true);
        }
    }
}
