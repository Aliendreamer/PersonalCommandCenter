using System.Security.Claims;
using System.Text.Json;
using CoreApi.Data;
using Microsoft.EntityFrameworkCore;
using ZiggyCreatures.Caching.Fusion;

namespace CoreApi.Auth;

/// <summary>
/// The request-scoped identity. Reads the subject, email and realm roles from the Keycloak
/// principal and JIT-provisions a local <see cref="User"/> row (cached by subject).
/// </summary>
public sealed class CurrentUser(PccDbContext db, IFusionCache cache) : ICurrentUser
{
    public int Id { get; private set; }
    public string Sub { get; private set; } = "";
    public string? Email { get; private set; }
    public IReadOnlyList<string> Roles { get; private set; } = [];

    public async Task InitializeAsync(ClaimsPrincipal principal, CancellationToken ct)
    {
        Sub = principal.FindFirst("sub")?.Value
            ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? "";
        Email = principal.FindFirst("email")?.Value;
        Roles = ReadRealmRoles(principal);

        if (Sub.Length == 0)
        {
            return;
        }

        Id = await cache.GetOrSetAsync<int>($"user:{Sub}", ProvisionAsync, token: ct);
    }

    private async Task<int> ProvisionAsync(CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Sub == Sub, ct);
        if (user is null)
        {
            user = new User { Sub = Sub, Email = Email };
            db.Users.Add(user);
            await db.SaveChangesAsync(ct);
        }
        else if (user.Email != Email)
        {
            user.Email = Email;
            user.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(ct);
        }

        return user.Id;
    }

    private static IReadOnlyList<string> ReadRealmRoles(ClaimsPrincipal principal)
    {
        var realmAccess = principal.FindFirst("realm_access")?.Value;
        if (!string.IsNullOrEmpty(realmAccess))
        {
            try
            {
                using var doc = JsonDocument.Parse(realmAccess);
                if (doc.RootElement.TryGetProperty("roles", out var roles)
                    && roles.ValueKind == JsonValueKind.Array)
                {
                    return roles.EnumerateArray()
                        .Select(r => r.GetString())
                        .Where(r => !string.IsNullOrEmpty(r))
                        .Select(r => r!)
                        .ToList();
                }
            }
            catch (JsonException)
            {
                // Fall through to flat role claims.
            }
        }

        return principal.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
    }
}
