using System.Security.Claims;
using CoreApi.Auth;
using CoreApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using ZiggyCreatures.Caching.Fusion;

namespace CoreApi.Tests.Auth;

public class CurrentUserTests
{
    private static PccDbContext NewDb() =>
        new(new DbContextOptionsBuilder<PccDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static IFusionCache NewCache() =>
        new FusionCache(Options.Create(new FusionCacheOptions()));

    private static ClaimsPrincipal Principal(string sub, string? email, params string[] roles)
    {
        var rolesJson = $$"""{"roles":[{{string.Join(",", roles.Select(r => $"\"{r}\""))}}]}""";
        var claims = new List<Claim> { new("sub", sub), new("realm_access", rolesJson) };
        if (email is not null)
        {
            claims.Add(new Claim("email", email));
        }

        return new ClaimsPrincipal(new ClaimsIdentity(claims, "test"));
    }

    [Fact]
    public async Task Initialize_provisions_user_and_reads_realm_roles()
    {
        await using var db = NewDb();
        var current = new CurrentUser(db, NewCache());

        await current.InitializeAsync(Principal("user-xyz", "x@y.z", "Admin", "User"), CancellationToken.None);

        Assert.Equal("user-xyz", current.Sub);
        Assert.Equal("x@y.z", current.Email);
        Assert.Equal(["Admin", "User"], current.Roles);
        Assert.True(current.Id > 0);
        var stored = await db.Users.SingleAsync();
        Assert.Equal("user-xyz", stored.Sub);
    }

    [Fact]
    public async Task Initialize_is_idempotent_for_the_same_subject()
    {
        await using var db = NewDb();
        var cache = NewCache();

        var first = new CurrentUser(db, cache);
        await first.InitializeAsync(Principal("user-1", "a@b.c", "User"), CancellationToken.None);

        var second = new CurrentUser(db, cache);
        await second.InitializeAsync(Principal("user-1", "a@b.c", "User"), CancellationToken.None);

        Assert.Equal(first.Id, second.Id);
        Assert.Equal(1, await db.Users.CountAsync());
    }
}
