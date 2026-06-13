using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace CoreApi.Auth;

/// <summary>
/// Talks OIDC to Keycloak: builds the authorize/end-session URLs and exchanges/refreshes tokens
/// against the realm's well-known endpoints (derived from <see cref="KeycloakSettings.Authority"/>).
/// </summary>
public sealed class KeycloakClient(HttpClient http, IOptions<AuthOptions> options) : IKeycloakClient
{
    private readonly KeycloakSettings _kc = options.Value.Keycloak;

    private string TokenEndpoint => $"{_kc.Authority}/protocol/openid-connect/token";

    public string BuildAuthorizeUrl(string codeChallenge, string state) =>
        $"{_kc.Authority}/protocol/openid-connect/auth" +
        "?response_type=code" +
        $"&client_id={Uri.EscapeDataString(_kc.ClientId)}" +
        $"&redirect_uri={Uri.EscapeDataString(_kc.CallbackUri)}" +
        "&scope=openid%20email%20profile" +
        $"&code_challenge={Uri.EscapeDataString(codeChallenge)}&code_challenge_method=S256" +
        $"&state={Uri.EscapeDataString(state)}";

    public string BuildEndSessionUrl(string? idToken)
    {
        var url = $"{_kc.Authority}/protocol/openid-connect/logout" +
            $"?client_id={Uri.EscapeDataString(_kc.ClientId)}" +
            $"&post_logout_redirect_uri={Uri.EscapeDataString(_kc.PostLogoutRedirectUri)}";
        return idToken is null ? url : $"{url}&id_token_hint={Uri.EscapeDataString(idToken)}";
    }

    public async Task<TokenSet> ExchangeCodeAsync(string code, string codeVerifier, CancellationToken ct)
    {
        using var response = await http.PostAsync(TokenEndpoint, new FormUrlEncodedContent(
            new Dictionary<string, string>
            {
                ["grant_type"] = "authorization_code",
                ["code"] = code,
                ["redirect_uri"] = _kc.CallbackUri,
                ["code_verifier"] = codeVerifier,
                ["client_id"] = _kc.ClientId,
                ["client_secret"] = _kc.ClientSecret,
            }), ct);
        response.EnsureSuccessStatusCode();
        var token = await response.Content.ReadFromJsonAsync<TokenResponse>(ct)
            ?? throw new InvalidOperationException("Empty token response from Keycloak.");
        return ToTokenSet(token);
    }

    public async Task<TokenSet?> RefreshAsync(string refreshToken, CancellationToken ct)
    {
        using var response = await http.PostAsync(TokenEndpoint, new FormUrlEncodedContent(
            new Dictionary<string, string>
            {
                ["grant_type"] = "refresh_token",
                ["refresh_token"] = refreshToken,
                ["client_id"] = _kc.ClientId,
                ["client_secret"] = _kc.ClientSecret,
            }), ct);
        if (!response.IsSuccessStatusCode)
        {
            return null;
        }

        var token = await response.Content.ReadFromJsonAsync<TokenResponse>(ct);
        return token is null ? null : ToTokenSet(token);
    }

    private static TokenSet ToTokenSet(TokenResponse t)
    {
        var now = DateTimeOffset.UtcNow;
        return new TokenSet(
            t.AccessToken,
            t.RefreshToken,
            now.AddSeconds(t.ExpiresIn),
            t.RefreshExpiresIn > 0 ? now.AddSeconds(t.RefreshExpiresIn) : null,
            t.IdToken);
    }

    private sealed record TokenResponse(
        [property: JsonPropertyName("access_token")] string AccessToken,
        [property: JsonPropertyName("refresh_token")] string? RefreshToken,
        [property: JsonPropertyName("expires_in")] int ExpiresIn,
        [property: JsonPropertyName("refresh_expires_in")] int RefreshExpiresIn,
        [property: JsonPropertyName("id_token")] string? IdToken);
}
