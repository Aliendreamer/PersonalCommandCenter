using Pcc.Plugins;

namespace CoreApi.Data;

/// <summary>A stored alert on the notification bus.</summary>
public sealed class Notification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Source { get; set; } = null!;
    public NotificationSeverity Severity { get; set; }
    public string Title { get; set; } = null!;
    public string? Message { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ReadAt { get; set; }
}

/// <summary>Created/updated timestamps shared by persisted entities.</summary>
public abstract class AuditableEntity
{
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

/// <summary>A locally-provisioned user, keyed to the Keycloak subject.</summary>
public sealed class User : AuditableEntity
{
    public int Id { get; set; }
    public string Sub { get; set; } = null!;
    public string? Email { get; set; }
    public string? FullName { get; set; }
}

/// <summary>A server-owned session. Only the token <em>hash</em> is stored, never the raw token.</summary>
public sealed class UserSession : AuditableEntity
{
    public int Id { get; set; }
    public string TokenHash { get; set; } = null!;
    public string Subject { get; set; } = null!;
    public string AccessToken { get; set; } = null!;
    public string? RefreshToken { get; set; }
    public DateTimeOffset AccessTokenExpiresAt { get; set; }
    public DateTimeOffset? RefreshTokenExpiresAt { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }
}
