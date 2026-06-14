using CoreApi.Data;
using Microsoft.EntityFrameworkCore;
using Pcc.Plugins;

namespace CoreApi.Notifications;

/// <summary>
/// The host alert-bus: persists notifications to Postgres (the source of truth) and best-effort
/// pushes them to ntfy. Implements both the write (<see cref="INotificationPublisher"/>) and
/// read/manage (<see cref="INotificationStore"/>) surfaces. Scoped (owns a <see cref="PccDbContext"/>).
/// </summary>
public sealed class NotificationService(
    PccDbContext db,
    INtfyClient ntfy,
    ILogger<NotificationService> logger) : INotificationPublisher, INotificationStore
{
    public async Task PublishAsync(
        string source,
        NotificationSeverity severity,
        string title,
        string? message = null,
        CancellationToken cancellationToken = default)
    {
        var notification = new Notification
        {
            Source = source,
            Severity = severity,
            Title = title,
            Message = message,
        };
        db.Notifications.Add(notification);
        await db.SaveChangesAsync(cancellationToken);

        // Delivery is a best-effort side-effect — never let ntfy being down lose the notification.
        try
        {
            await ntfy.PublishAsync(severity, title, message, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "ntfy delivery failed for notification {Id}", notification.Id);
        }
    }

    public async Task<IReadOnlyList<NotificationDto>> ListAsync(CancellationToken cancellationToken = default)
    {
        var rows = await db.Notifications
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync(cancellationToken);
        return rows.Select(Map).ToList();
    }

    public Task<int> UnreadCountAsync(CancellationToken cancellationToken = default) =>
        db.Notifications.CountAsync(n => n.ReadAt == null, cancellationToken);

    public async Task<bool> MarkReadAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var notification = await db.Notifications.FirstOrDefaultAsync(n => n.Id == id, cancellationToken);
        if (notification is null)
        {
            return false;
        }

        if (notification.ReadAt is null)
        {
            notification.ReadAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
        }

        return true;
    }

    public async Task MarkAllReadAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;
        var unread = await db.Notifications.Where(n => n.ReadAt == null).ToListAsync(cancellationToken);
        foreach (var notification in unread)
        {
            notification.ReadAt = now;
        }

        if (unread.Count > 0)
        {
            await db.SaveChangesAsync(cancellationToken);
        }
    }

    private static NotificationDto Map(Notification n) =>
        new(n.Id, n.Source, n.Severity, n.Title, n.Message, n.CreatedAt, n.ReadAt);
}
