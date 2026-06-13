using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace CoreApi.Auth;

/// <summary>
/// Pure OIDC/BFF protocol helpers: PKCE, the signed <c>state</c> codec, <c>returnTo</c>
/// sanitization, opaque session-token generation + hashing, and reading the <c>sub</c> from a
/// JWT. No I/O — every method is deterministic and unit-tested.
/// </summary>
public static class OidcProtocol
{
    /// <summary>Creates a PKCE (verifier, S256 challenge) pair.</summary>
    public static (string Verifier, string Challenge) CreatePkce()
    {
        var verifier = Base64Url(RandomNumberGenerator.GetBytes(32));
        var challenge = Base64Url(SHA256.HashData(Encoding.ASCII.GetBytes(verifier)));
        return (verifier, challenge);
    }

    /// <summary>A fresh base64url nonce for CSRF binding between the login and callback.</summary>
    public static string NewNonce() => Base64Url(RandomNumberGenerator.GetBytes(16));

    /// <summary>A 256-bit opaque session token plus the SHA-256 hash to persist (never store the raw).</summary>
    public static (string Raw, string Hash) CreateSessionToken()
    {
        var raw = Base64Url(RandomNumberGenerator.GetBytes(32));
        return (raw, HashToken(raw));
    }

    /// <summary>SHA-256 (base64) of a raw session token — the value stored and looked up.</summary>
    public static string HashToken(string raw) =>
        Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(raw)));

    /// <summary>Encodes the OIDC <c>state</c> carrying the nonce and the sanitized returnTo.</summary>
    public static string EncodeState(string nonce, string returnTo)
    {
        var json = JsonSerializer.SerializeToUtf8Bytes(new StatePayload(nonce, returnTo));
        return Base64Url(json);
    }

    /// <summary>Decodes the OIDC <c>state</c>; returns false for anything malformed.</summary>
    public static bool TryDecodeState(string state, out string nonce, out string returnTo)
    {
        nonce = string.Empty;
        returnTo = "/";
        try
        {
            var payload = JsonSerializer.Deserialize<StatePayload>(Base64UrlDecode(state));
            if (payload is null || string.IsNullOrEmpty(payload.Nonce))
            {
                return false;
            }

            nonce = payload.Nonce;
            returnTo = SanitizeReturnTo(payload.ReturnTo);
            return true;
        }
        catch (Exception ex) when (ex is FormatException or JsonException)
        {
            return false;
        }
    }

    /// <summary>
    /// Reduces a returnTo to a safe single-slash relative path, defeating open redirects.
    /// Anything not beginning with a single <c>/</c> (e.g. <c>//host</c>, a scheme, <c>/\</c>)
    /// collapses to <c>/</c>.
    /// </summary>
    public static string SanitizeReturnTo(string? returnTo)
    {
        if (string.IsNullOrEmpty(returnTo) || returnTo[0] != '/')
        {
            return "/";
        }

        if (returnTo.Length >= 2 && (returnTo[1] == '/' || returnTo[1] == '\\'))
        {
            return "/";
        }

        return returnTo;
    }

    /// <summary>Reads the <c>sub</c> claim from a JWT's payload, or null if it can't be parsed.</summary>
    public static string? ReadSubject(string jwt)
    {
        var parts = jwt.Split('.');
        if (parts.Length < 2)
        {
            return null;
        }

        try
        {
            using var doc = JsonDocument.Parse(Base64UrlDecode(parts[1]));
            return doc.RootElement.TryGetProperty("sub", out var sub) ? sub.GetString() : null;
        }
        catch (Exception ex) when (ex is FormatException or JsonException)
        {
            return null;
        }
    }

    private static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] Base64UrlDecode(string value)
    {
        var s = value.Replace('-', '+').Replace('_', '/');
        return Convert.FromBase64String(s.PadRight(s.Length + ((4 - (s.Length % 4)) % 4), '='));
    }

    private sealed record StatePayload(string Nonce, string ReturnTo);
}
