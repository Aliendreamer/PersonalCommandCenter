using System.Collections.Concurrent;
using CoreApi.Data;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;

namespace CoreApi.Auth;

/// <summary>
/// The whole server-owned session lifecycle over Postgres: issue an opaque token (storing only
/// its hash), resolve it to a valid access token (transparently refreshing via Keycloak),
/// revoke it for instant logout, and purge revoked/expired rows. The Keycloak access/refresh
/// tokens are encrypted at rest (DataProtection); only their hashes-equivalent ciphertext is stored.
/// </summary>
public sealed class SessionService : ISessionService
{
    private static readonly TimeSpan Leeway = TimeSpan.FromSeconds(30);

    // Serialize the token refresh per session across concurrent requests: a single page load fires
    // several server-to-server fetches, and Keycloak's refresh token is single-use — without this,
    // two parallel refreshes would race and the loser would invalidate the winner's new token.
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> RefreshGates = new(StringComparer.Ordinal);

    private readonly PccDbContext db;
    private readonly IKeycloakClient keycloak;
    private readonly IDataProtector protector;

    public SessionService(PccDbContext db, IKeycloakClient keycloak, IDataProtectionProvider dataProtection)
    {
        this.db = db;
        this.keycloak = keycloak;
        // Tokens are encrypted with a key that lives outside the DB (the persisted /keys keyring), so a
        // database-only leak can't use them.
        protector = dataProtection.CreateProtector("pcc.session-tokens.v1");
    }

    private string? Protect(string? value) => value is null ? null : protector.Protect(value);

    public async Task<string> CreateAsync(string subject, TokenSet tokens, CancellationToken ct)
    {
        var (raw, hash) = OidcProtocol.CreateSessionToken();
        db.Sessions.Add(new UserSession
        {
            TokenHash = hash,
            Subject = subject,
            AccessToken = protector.Protect(tokens.AccessToken),
            RefreshToken = Protect(tokens.RefreshToken),
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

        if (session.AccessTokenExpiresAt > DateTimeOffset.UtcNow.Add(Leeway))
        {
            return protector.Unprotect(session.AccessToken);
        }

        // The access token is expired — serialize the refresh per session so concurrent requests don't
        // each spend the single-use refresh token (the second would invalidate the first's new token).
        var gate = RefreshGates.GetOrAdd(hash, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(ct);
        try
        {
            // Re-read inside the gate: another request may have just refreshed this session.
            session = await db.Sessions
                .FirstOrDefaultAsync(s => s.TokenHash == hash && s.RevokedAt == null, ct);
            if (session is null)
            {
                return null;
            }

            var now = DateTimeOffset.UtcNow;
            if (session.AccessTokenExpiresAt > now.Add(Leeway))
            {
                return protector.Unprotect(session.AccessToken);
            }

            // A refresh token is usable when present and either non-expiring (an offline token, stored
            // with a null expiry) or not yet past its expiry.
            if (session.RefreshToken is { } encryptedRefresh
                && (session.RefreshTokenExpiresAt is null || session.RefreshTokenExpiresAt > now))
            {
                var refreshed = await keycloak.RefreshAsync(protector.Unprotect(encryptedRefresh), ct);
                if (refreshed is null)
                {
                    return null;
                }

                session.AccessToken = protector.Protect(refreshed.AccessToken);
                session.RefreshToken = Protect(refreshed.RefreshToken);
                session.AccessTokenExpiresAt = refreshed.AccessExpiresAt;
                session.RefreshTokenExpiresAt = refreshed.RefreshExpiresAt;
                session.UpdatedAt = now;
                await db.SaveChangesAsync(ct);
                return refreshed.AccessToken;
            }

            return null;
        }
        finally
        {
            gate.Release();
        }
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

    // Sessions idle longer than this are reaped even if they hold a (non-expiring) offline refresh
    // token — a server-side mirror of Keycloak's offline-session idle window, so dead rows don't pile up.
    private static readonly TimeSpan OfflineIdleCap = TimeSpan.FromDays(90);

    public async Task<int> PurgeAsync(CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        var idleBefore = now - OfflineIdleCap;
        var stale = await db.Sessions
            .Where(s => s.RevokedAt != null
                // A non-null refresh expiry that has passed: the refresh token is dead.
                || (s.RefreshTokenExpiresAt != null && s.RefreshTokenExpiresAt < now)
                // No refresh token at all + an expired access token: unresolvable, never refreshable.
                || (s.RefreshToken == null && s.AccessTokenExpiresAt < now)
                // Idle past the offline window (covers offline sessions with a null refresh expiry).
                || s.UpdatedAt < idleBefore)
            .ToListAsync(ct);
        db.Sessions.RemoveRange(stale);
        await db.SaveChangesAsync(ct);
        return stale.Count;
    }
}
