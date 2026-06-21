using CoreApi.Auth;
using CoreApi.Data;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace CoreApi.Tests.Auth;

public class SessionServiceTests
{
    private static PccDbContext NewDb() =>
        new(new DbContextOptionsBuilder<PccDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static TokenSet Tokens(int accessMinutes = 10, int? refreshMinutes = 60) =>
        new(
            AccessToken: "access-token",
            RefreshToken: "refresh-token",
            AccessExpiresAt: DateTimeOffset.UtcNow.AddMinutes(accessMinutes),
            RefreshExpiresAt: refreshMinutes is null ? null : DateTimeOffset.UtcNow.AddMinutes(refreshMinutes.Value));

    [Fact]
    public async Task CreateAsync_persists_hash_not_raw_and_returns_raw()
    {
        await using var db = NewDb();
        var service = new SessionService(db, Mock.Of<IKeycloakClient>());

        var raw = await service.CreateAsync("sub-1", Tokens(), CancellationToken.None);

        var stored = await db.Sessions.SingleAsync();
        Assert.NotEqual(raw, stored.TokenHash);
        Assert.Equal(OidcProtocol.HashToken(raw), stored.TokenHash);
        Assert.Equal("access-token", stored.AccessToken);
    }

    [Fact]
    public async Task Resolve_returns_unexpired_access_token()
    {
        await using var db = NewDb();
        var service = new SessionService(db, Mock.Of<IKeycloakClient>());
        var raw = await service.CreateAsync("sub-1", Tokens(accessMinutes: 10), CancellationToken.None);

        var token = await service.ResolveAccessTokenAsync(raw, CancellationToken.None);

        Assert.Equal("access-token", token);
    }

    [Fact]
    public async Task Resolve_refreshes_expired_access_token()
    {
        await using var db = NewDb();
        var keycloak = new Mock<IKeycloakClient>();
        keycloak.Setup(k => k.RefreshAsync("refresh-token", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TokenSet("new-access", "new-refresh",
                DateTimeOffset.UtcNow.AddMinutes(10), DateTimeOffset.UtcNow.AddMinutes(60)));
        var service = new SessionService(db, keycloak.Object);
        var raw = await service.CreateAsync("sub-1",
            Tokens(accessMinutes: -1, refreshMinutes: 60), CancellationToken.None);

        var token = await service.ResolveAccessTokenAsync(raw, CancellationToken.None);

        Assert.Equal("new-access", token);
        var stored = await db.Sessions.SingleAsync();
        Assert.Equal("new-access", stored.AccessToken);
        Assert.Equal("new-refresh", stored.RefreshToken);
    }

    [Fact]
    public async Task Resolve_refreshes_an_offline_session_with_no_refresh_expiry()
    {
        // An offline token is returned with refresh_expires_in:0 → a null RefreshTokenExpiresAt. That
        // null means "non-expiring", not "no refresh path" — the session must still refresh.
        await using var db = NewDb();
        var keycloak = new Mock<IKeycloakClient>();
        keycloak.Setup(k => k.RefreshAsync("refresh-token", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TokenSet("new-access", "new-refresh",
                DateTimeOffset.UtcNow.AddMinutes(10), RefreshExpiresAt: null));
        var service = new SessionService(db, keycloak.Object);
        var raw = await service.CreateAsync("sub-1",
            Tokens(accessMinutes: -1, refreshMinutes: null), CancellationToken.None);

        var token = await service.ResolveAccessTokenAsync(raw, CancellationToken.None);

        Assert.Equal("new-access", token);
    }

    [Fact]
    public async Task Resolve_returns_null_when_refresh_fails()
    {
        await using var db = NewDb();
        var keycloak = new Mock<IKeycloakClient>();
        keycloak.Setup(k => k.RefreshAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TokenSet?)null);
        var service = new SessionService(db, keycloak.Object);
        var raw = await service.CreateAsync("sub-1",
            Tokens(accessMinutes: -1, refreshMinutes: 60), CancellationToken.None);

        var token = await service.ResolveAccessTokenAsync(raw, CancellationToken.None);

        Assert.Null(token);
    }

    [Fact]
    public async Task Concurrent_resolve_refreshes_the_session_only_once()
    {
        // Two parallel requests (separate DbContexts) with an expired access token must not each spend
        // the single-use refresh token — the per-session gate serializes them to one refresh.
        var dbName = Guid.NewGuid().ToString();
        DbContextOptions<PccDbContext> Opts() =>
            new DbContextOptionsBuilder<PccDbContext>().UseInMemoryDatabase(dbName).Options;

        var refreshes = 0;
        var keycloak = new Mock<IKeycloakClient>();
        keycloak.Setup(k => k.RefreshAsync("refresh-token", It.IsAny<CancellationToken>()))
            .ReturnsAsync(() =>
            {
                Interlocked.Increment(ref refreshes);
                return new TokenSet("new-access", "new-refresh",
                    DateTimeOffset.UtcNow.AddMinutes(10), DateTimeOffset.UtcNow.AddMinutes(60));
            });

        string raw;
        await using (var seed = new PccDbContext(Opts()))
        {
            raw = await new SessionService(seed, keycloak.Object)
                .CreateAsync("sub", Tokens(accessMinutes: -1, refreshMinutes: 60), CancellationToken.None);
        }

        await using var dbA = new PccDbContext(Opts());
        await using var dbB = new PccDbContext(Opts());
        var results = await Task.WhenAll(
            new SessionService(dbA, keycloak.Object).ResolveAccessTokenAsync(raw, CancellationToken.None),
            new SessionService(dbB, keycloak.Object).ResolveAccessTokenAsync(raw, CancellationToken.None));

        Assert.All(results, r => Assert.Equal("new-access", r));
        Assert.Equal(1, refreshes);
    }

    [Fact]
    public async Task Revoke_then_resolve_returns_null()
    {
        await using var db = NewDb();
        var service = new SessionService(db, Mock.Of<IKeycloakClient>());
        var raw = await service.CreateAsync("sub-1", Tokens(), CancellationToken.None);

        await service.RevokeAsync(raw, CancellationToken.None);

        Assert.Null(await service.ResolveAccessTokenAsync(raw, CancellationToken.None));
    }

    [Fact]
    public async Task Purge_removes_revoked_and_expired_sessions()
    {
        await using var db = NewDb();
        var service = new SessionService(db, Mock.Of<IKeycloakClient>());
        var live = await service.CreateAsync("live", Tokens(), CancellationToken.None);
        var revoked = await service.CreateAsync("revoked", Tokens(), CancellationToken.None);
        await service.CreateAsync("expired", Tokens(accessMinutes: -10, refreshMinutes: -5), CancellationToken.None);
        await service.RevokeAsync(revoked, CancellationToken.None);

        var removed = await service.PurgeAsync(CancellationToken.None);

        Assert.Equal(2, removed);
        var remaining = await db.Sessions.SingleAsync();
        Assert.Equal(OidcProtocol.HashToken(live), remaining.TokenHash);
    }

    [Fact]
    public async Task Purge_removes_a_session_with_no_refresh_token_and_an_expired_access_token()
    {
        await using var db = NewDb();
        var service = new SessionService(db, Mock.Of<IKeycloakClient>());
        // No refresh token at all + expired access → unresolvable; must be reaped.
        await service.CreateAsync(
            "orphan",
            new TokenSet("access", RefreshToken: null, DateTimeOffset.UtcNow.AddMinutes(-10), RefreshExpiresAt: null),
            CancellationToken.None);

        var removed = await service.PurgeAsync(CancellationToken.None);

        Assert.Equal(1, removed);
        Assert.Empty(await db.Sessions.ToListAsync());
    }

    [Fact]
    public async Task Purge_keeps_an_active_offline_session_with_a_null_refresh_expiry()
    {
        // An offline session (refresh token present, no expiry, recently used) is still usable even with
        // an expired access token — it must NOT be reaped.
        await using var db = NewDb();
        var service = new SessionService(db, Mock.Of<IKeycloakClient>());
        await service.CreateAsync("offline", Tokens(accessMinutes: -10, refreshMinutes: null), CancellationToken.None);

        var removed = await service.PurgeAsync(CancellationToken.None);

        Assert.Equal(0, removed);
        Assert.Single(await db.Sessions.ToListAsync());
    }

    [Fact]
    public async Task Purge_removes_an_offline_session_idle_past_the_offline_window()
    {
        await using var db = NewDb();
        var service = new SessionService(db, Mock.Of<IKeycloakClient>());
        await service.CreateAsync("stale", Tokens(accessMinutes: -10, refreshMinutes: null), CancellationToken.None);
        var session = await db.Sessions.SingleAsync();
        session.UpdatedAt = DateTimeOffset.UtcNow.AddDays(-120); // beyond the 90-day offline idle cap
        await db.SaveChangesAsync();

        var removed = await service.PurgeAsync(CancellationToken.None);

        Assert.Equal(1, removed);
        Assert.Empty(await db.Sessions.ToListAsync());
    }
}
