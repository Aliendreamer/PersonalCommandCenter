using System.Security.Cryptography;
using System.Text;
using CoreApi.Auth;

namespace CoreApi.Tests.Auth;

public class OidcProtocolTests
{
    [Fact]
    public void CreatePkce_challenge_is_s256_of_verifier()
    {
        var (verifier, challenge) = OidcProtocol.CreatePkce();

        Assert.False(string.IsNullOrEmpty(verifier));
        Assert.NotEqual(verifier, challenge);
        // S256: challenge = base64url(SHA256(ASCII(verifier))).
        var expected = Base64Url(SHA256.HashData(Encoding.ASCII.GetBytes(verifier)));
        Assert.Equal(expected, challenge);
        Assert.DoesNotContain('+', verifier);
        Assert.DoesNotContain('/', verifier);
        Assert.DoesNotContain('=', verifier);
    }

    [Fact]
    public void CreateSessionToken_stores_hash_not_raw()
    {
        var (raw, hash) = OidcProtocol.CreateSessionToken();

        Assert.False(string.IsNullOrEmpty(raw));
        Assert.NotEqual(raw, hash);
        Assert.Equal(hash, OidcProtocol.HashToken(raw));
    }

    [Fact]
    public void State_round_trips_nonce_and_returnto()
    {
        var state = OidcProtocol.EncodeState("nonce-123", "/devices");

        Assert.True(OidcProtocol.TryDecodeState(state, out var nonce, out var returnTo));
        Assert.Equal("nonce-123", nonce);
        Assert.Equal("/devices", returnTo);
    }

    [Fact]
    public void TryDecodeState_rejects_garbage()
    {
        Assert.False(OidcProtocol.TryDecodeState("not-a-valid-state", out _, out _));
    }

    [Theory]
    [InlineData("/devices", "/devices")]
    [InlineData("/a/b/c", "/a/b/c")]
    [InlineData(null, "/")]
    [InlineData("", "/")]
    [InlineData("devices", "/")]
    [InlineData("//evil.com", "/")]
    [InlineData("https://evil.com", "/")]
    [InlineData("http://evil.com", "/")]
    [InlineData("/\\evil.com", "/")]
    public void SanitizeReturnTo_only_allows_single_slash_relative(string? input, string expected)
    {
        Assert.Equal(expected, OidcProtocol.SanitizeReturnTo(input));
    }

    [Fact]
    public void ReadSubject_extracts_sub_from_jwt()
    {
        var jwt = FakeJwt("""{"sub":"user-abc","email":"a@b.c"}""");

        Assert.Equal("user-abc", OidcProtocol.ReadSubject(jwt));
    }

    [Fact]
    public void ReadSubject_returns_null_for_malformed_token()
    {
        Assert.Null(OidcProtocol.ReadSubject("garbage"));
    }

    private static string FakeJwt(string payloadJson)
    {
        var header = Base64Url("{\"alg\":\"none\"}"u8.ToArray());
        var payload = Base64Url(Encoding.UTF8.GetBytes(payloadJson));
        return $"{header}.{payload}.sig";
    }

    private static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
