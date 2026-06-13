namespace CoreApi.Auth;

/// <summary>The OIDC tokens the API holds for a session (never exposed to the browser).</summary>
public sealed record TokenSet(
    string AccessToken,
    string? RefreshToken,
    DateTimeOffset AccessExpiresAt,
    DateTimeOffset? RefreshExpiresAt,
    string? IdToken = null);

/// <summary>Talks the OIDC protocol to Keycloak (discovery, authorize URL, code/refresh exchange).</summary>
public interface IKeycloakClient
{
    string BuildAuthorizeUrl(string codeChallenge, string state);

    string BuildEndSessionUrl(string? idToken);

    Task<TokenSet> ExchangeCodeAsync(string code, string codeVerifier, CancellationToken ct);

    Task<TokenSet?> RefreshAsync(string refreshToken, CancellationToken ct);
}

/// <summary>The server-owned session lifecycle: create, resolve (+refresh), revoke, purge.</summary>
public interface ISessionService
{
    /// <summary>Persists a new session (hash + tokens) and returns the raw opaque session id.</summary>
    Task<string> CreateAsync(string subject, TokenSet tokens, CancellationToken ct);

    /// <summary>Returns a valid access token for the session (refreshing if needed), or null.</summary>
    Task<string?> ResolveAccessTokenAsync(string rawToken, CancellationToken ct);

    /// <summary>Revokes the session so any further use is rejected.</summary>
    Task RevokeAsync(string rawToken, CancellationToken ct);

    /// <summary>Removes revoked and fully-expired sessions; returns how many were removed.</summary>
    Task<int> PurgeAsync(CancellationToken ct);
}
