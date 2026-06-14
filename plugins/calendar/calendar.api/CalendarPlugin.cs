using FastEndpoints;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Pcc.Plugins.Calendar;

/// <summary>Read + write CalDAV calendar plugin: lists/creates/updates/deletes VEVENTs.</summary>
public sealed class CalendarPlugin : IPlugin
{
    public string Id => "calendar";

    public PluginManifest Manifest { get; } = new("calendar", "Calendar", "/calendar", ["calendar-today"]);

    public void Configure(IServiceCollection services, IConfiguration config)
    {
        services.Configure<CalendarOptions>(config);
        services.AddHttpClient<ICalendarClient, CalDavClient>();
    }
}

/// <summary><c>GET /api/calendar/events?days=N</c> — events in the [now, now+window) window.</summary>
internal sealed class ListCalendarEventsEndpoint : EndpointWithoutRequest<IReadOnlyList<CalendarEvent>>
{
    public override void Configure() => Get("/calendar/events");

    public override async Task HandleAsync(CancellationToken ct)
    {
        var client = Resolve<ICalendarClient>();
        var options = Resolve<IOptions<CalendarOptions>>().Value;
        var days = Query<int?>("days", isRequired: false) ?? options.WindowDays;
        try
        {
            var events = await client.ListAsync(TimeSpan.FromDays(Math.Max(1, days)), ct);
            await Send.OkAsync(events, ct);
        }
        catch (Exception)
        {
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status502BadGateway));
        }
    }
}

/// <summary><c>POST /api/calendar/events</c> — create an event.</summary>
internal sealed class CreateCalendarEventEndpoint : Endpoint<CalendarEventInput, CalendarEvent>
{
    public override void Configure() => Post("/calendar/events");

    public override async Task HandleAsync(CalendarEventInput req, CancellationToken ct)
    {
        if (req.End < req.Start)
        {
            await Send.ResultAsync(Results.BadRequest(new { error = "end must not precede start" }));
            return;
        }

        var client = Resolve<ICalendarClient>();
        try
        {
            var created = await client.CreateAsync(req, ct);
            await Send.ResultAsync(Results.Created($"/api/calendar/events/{created.Uid}", created));
        }
        catch (Exception)
        {
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status502BadGateway));
        }
    }
}

/// <summary><c>PUT /api/calendar/events/{uid}</c> — update an event.</summary>
internal sealed class UpdateCalendarEventEndpoint : Endpoint<UpdateCalendarEventRequest, CalendarEvent>
{
    public override void Configure() => Put("/calendar/events/{uid}");

    public override async Task HandleAsync(UpdateCalendarEventRequest req, CancellationToken ct)
    {
        if (req.End < req.Start)
        {
            await Send.ResultAsync(Results.BadRequest(new { error = "end must not precede start" }));
            return;
        }

        var client = Resolve<ICalendarClient>();
        try
        {
            var updated = await client.UpdateAsync(
                req.Uid,
                new CalendarEventInput(req.Title, req.Start, req.End, req.AllDay, req.Location, req.Description),
                ct);
            if (updated is null)
            {
                await Send.NotFoundAsync(ct);
                return;
            }

            await Send.OkAsync(updated, ct);
        }
        catch (Exception)
        {
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status502BadGateway));
        }
    }
}

/// <summary><c>DELETE /api/calendar/events/{uid}</c> — delete an event.</summary>
internal sealed class DeleteCalendarEventEndpoint : EndpointWithoutRequest
{
    public override void Configure() => Delete("/calendar/events/{uid}");

    public override async Task HandleAsync(CancellationToken ct)
    {
        var uid = Route<string>("uid")!;
        var client = Resolve<ICalendarClient>();
        try
        {
            var deleted = await client.DeleteAsync(uid, ct);
            if (!deleted)
            {
                await Send.NotFoundAsync(ct);
                return;
            }

            await Send.NoContentAsync(ct);
        }
        catch (Exception)
        {
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status502BadGateway));
        }
    }
}

/// <summary>Update request: <c>uid</c> from the route, the rest from the JSON body.</summary>
public sealed class UpdateCalendarEventRequest
{
    public string Uid { get; set; } = "";

    public string Title { get; set; } = "";

    public DateTimeOffset Start { get; set; }

    public DateTimeOffset End { get; set; }

    public bool AllDay { get; set; }

    public string? Location { get; set; }

    public string? Description { get; set; }
}
