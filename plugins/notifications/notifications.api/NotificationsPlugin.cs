using FastEndpoints;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Pcc.Plugins.Notifications;

/// <summary>
/// Surfaces the host's notification bus: a list/mark-read API, a "Notifications" nav entry, and an
/// unread-count tile. The store itself is host infrastructure (always registered); this plugin only
/// adds the API + UI surface, gated by <c>Plugins:Notifications:Enabled</c>.
/// </summary>
public sealed class NotificationsPlugin : IPlugin
{
    public string Id => "notifications";

    public PluginManifest Manifest { get; } =
        new("notifications", "Notifications", "/notifications", ["notifications-unread"]);

    public void Configure(IServiceCollection services, IConfiguration config)
    {
        // No plugin-specific services — INotificationStore is registered by the host.
    }
}

/// <summary>Response of <c>GET /api/notifications</c>: the list plus the current unread count.</summary>
public sealed record NotificationListResponse(IReadOnlyList<NotificationDto> Notifications, int Unread);

/// <summary><c>GET /api/notifications</c> — newest-first, with the unread count.</summary>
internal sealed class ListNotificationsEndpoint : EndpointWithoutRequest<NotificationListResponse>
{
    public override void Configure() => Get("/notifications");

    public override async Task HandleAsync(CancellationToken ct)
    {
        var store = Resolve<INotificationStore>();
        var notifications = await store.ListAsync(ct);
        var unread = await store.UnreadCountAsync(ct);
        await Send.OkAsync(new NotificationListResponse(notifications, unread), ct);
    }
}

/// <summary><c>POST /api/notifications/{id}/read</c> — mark one read.</summary>
internal sealed class MarkNotificationReadEndpoint : EndpointWithoutRequest
{
    public override void Configure() => Post("/notifications/{id}/read");

    public override async Task HandleAsync(CancellationToken ct)
    {
        var id = Route<Guid>("id");
        var store = Resolve<INotificationStore>();
        if (await store.MarkReadAsync(id, ct))
        {
            await Send.NoContentAsync(ct);
            return;
        }

        await Send.NotFoundAsync(ct);
    }
}

/// <summary><c>POST /api/notifications/read-all</c> — mark everything read.</summary>
internal sealed class MarkAllNotificationsReadEndpoint : EndpointWithoutRequest
{
    public override void Configure() => Post("/notifications/read-all");

    public override async Task HandleAsync(CancellationToken ct)
    {
        await Resolve<INotificationStore>().MarkAllReadAsync(ct);
        await Send.NoContentAsync(ct);
    }
}
