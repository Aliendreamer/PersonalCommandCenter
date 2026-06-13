using CoreApi.Data;
using Microsoft.EntityFrameworkCore;

namespace CoreApi.Auth;

/// <summary>
/// The whole server-owned session lifecycle over Postgres: issue an opaque token (storing only
/// its hash), resolve it to a valid access token (transparently refreshing via Keycloak),
/// revoke it for instant logout, and purge revoked/expired rows.
/// </summary>
public sealed class SessionService(PccDbContext db, IKeycloakClient keycloak) : ISessionService
{
    private static readonly TimeSpan Leeway = TimeSpan.FromSeconds(30);

    public async Task<string> CreateAsync(string subject, TokenSet tokens, CancellationToken ct)
    {
        var (raw, hash) = OidcProtocol.CreateSessionToken();
        db.Sessions.Add(new UserSession
        {
            TokenHash = hash,
            Subject = subject,
            AccessToken = tokens.AccessToken,
            RefreshToken = tokens.RefreshToken,
            AccessTokenExpiresAt = tokens.AccessExpiresAt,
            RefreshTokenExpiresAt = tokens.RefreshExpiresAt,
        });
        await db.SaveChangesAsync(ct);
        return raw;
    }

    public async Task<string?> ResolveAccessTokenAsync(string rawToken, CancellationToken ct)
    {
        var hash = OidcProtocol.HashToken(rawToken);
        var session = await db.Sessions
            .FirstOrDefaultAsync(s => s.TokenHash == hash && s.RevokedAt == null, ct);
        if (session is null)
        {
            return null;
        }

        var now = DateTimeOffset.UtcNow;
        if (session.AccessTokenExpiresAt > now.Add(Leeway))
        {
            return session.AccessToken;
        }

        if (session.RefreshToken is { } refresh && session.RefreshTokenExpiresAt > now)
        {
            var refreshed = await keycloak.RefreshAsync(refresh, ct);
            if (refreshed is null)
            {
                return null;
            }

            session.AccessToken = refreshed.AccessToken;
            session.RefreshToken = refreshed.RefreshToken;
            session.AccessTokenExpiresAt = refreshed.AccessExpiresAt;
            session.RefreshTokenExpiresAt = refreshed.RefreshExpiresAt;
            session.UpdatedAt = now;
            await db.SaveChangesAsync(ct);
            return refreshed.AccessToken;
        }

        return null;
    }

    public async Task RevokeAsync(string rawToken, CancellationToken ct)
    {
        var hash = OidcProtocol.HashToken(rawToken);
        var session = await db.Sessions.FirstOrDefaultAsync(s => s.TokenHash == hash, ct);
        if (session is null)
        {
            return;
        }

        session.RevokedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    public async Task<int> PurgeAsync(CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        var stale = await db.Sessions
            .Where(s => s.RevokedAt != null
                || (s.RefreshTokenExpiresAt != null && s.RefreshTokenExpiresAt < now))
            .ToListAsync(ct);
        db.Sessions.RemoveRange(stale);
        await db.SaveChangesAsync(ct);
        return stale.Count;
    }
}
