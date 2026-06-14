namespace Pcc.Plugins;

/// <summary>Severity of an alert raised onto the notification bus.</summary>
public enum NotificationSeverity
{
    Info,
    Warning,
    Error,
}

/// <summary>A notification as surfaced to plugins/UI (decoupled from the host's EF entity).</summary>
public sealed record NotificationDto(
    Guid Id,
    string Source,
    NotificationSeverity Severity,
    string Title,
    string? Message,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ReadAt);

/// <summary>Raises alerts onto the host's notification bus. Injectable by any plugin or host code.</summary>
public interface INotificationPublisher
{
    /// <summary>Persists a notification and best-effort delivers it (e.g. ntfy). Never throws on delivery failure.</summary>
    Task PublishAsync(
        string source,
        NotificationSeverity severity,
        string title,
        string? message = null,
        CancellationToken cancellationToken = default);
}

/// <summary>Reads and manages stored notifications. Implemented by the host, consumed by the plugin.</summary>
public interface INotificationStore
{
    Task<IReadOnlyList<NotificationDto>> ListAsync(CancellationToken cancellationToken = default);

    Task<int> UnreadCountAsync(CancellationToken cancellationToken = default);

    /// <summary>Marks one notification read; returns <c>false</c> when the id is unknown.</summary>
    Task<bool> MarkReadAsync(Guid id, CancellationToken cancellationToken = default);

    Task MarkAllReadAsync(CancellationToken cancellationToken = default);
}
