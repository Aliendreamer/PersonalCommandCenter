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
}
