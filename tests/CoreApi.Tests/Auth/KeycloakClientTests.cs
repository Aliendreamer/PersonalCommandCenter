using System.Net;
using System.Text;
using CoreApi.Auth;
using Microsoft.Extensions.Options;

namespace CoreApi.Tests.Auth;

public class KeycloakClientTests
{
    [Fact]
    public void BuildAuthorizeUrl_has_pkce_and_state()
    {
        var (client, _) = Build(Json("{}"));

        var url = client.BuildAuthorizeUrl("CHALLENGE", "STATE");

        Assert.StartsWith("http://kc/realms/Pcc/protocol/openid-connect/auth", url);
        Assert.Contains("client_id=pcc_api", url);
        Assert.Contains("code_challenge=CHALLENGE", url);
        Assert.Contains("code_challenge_method=S256", url);
        Assert.Contains("state=STATE", url);
        Assert.Contains("redirect_uri=", url);
    }

    [Fact]
    public async Task ExchangeCode_posts_to_token_endpoint_and_maps_tokens()
    {
        var (client, handler) = Build(Json(
            """{"access_token":"AT","refresh_token":"RT","expires_in":300,"refresh_expires_in":1800,"id_token":"IT"}"""));

        var tokens = await client.ExchangeCodeAsync("the-code", "the-verifier", CancellationToken.None);

        Assert.Equal("AT", tokens.AccessToken);
        Assert.Equal("RT", tokens.RefreshToken);
        Assert.Equal("IT", tokens.IdToken);
        Assert.True(tokens.AccessExpiresAt > DateTimeOffset.UtcNow.AddSeconds(250));
        Assert.Equal("http://kc/realms/Pcc/protocol/openid-connect/token", handler.LastUri);
        Assert.Contains("grant_type=authorization_code", handler.LastBody);
        Assert.Contains("code=the-code", handler.LastBody);
        Assert.Contains("code_verifier=the-verifier", handler.LastBody);
    }

    [Fact]
    public async Task Refresh_returns_null_on_failure()
    {
        var (client, _) = Build(Json("", HttpStatusCode.BadRequest));

        Assert.Null(await client.RefreshAsync("bad-refresh", CancellationToken.None));
    }

    [Fact]
    public async Task Refresh_maps_tokens_on_success()
    {
        var (client, handler) = Build(Json(
            """{"access_token":"AT2","refresh_token":"RT2","expires_in":300,"refresh_expires_in":1800}"""));

        var tokens = await client.RefreshAsync("old-refresh", CancellationToken.None);

        Assert.NotNull(tokens);
        Assert.Equal("AT2", tokens!.AccessToken);
        Assert.Contains("grant_type=refresh_token", handler.LastBody);
    }

    private static (KeycloakClient Client, StubHandler Handler) Build(HttpResponseMessage response)
    {
        var handler = new StubHandler(response);
        var options = Options.Create(new AuthOptions
        {
            Keycloak = new KeycloakSettings
            {
                Authority = "http://kc/realms/Pcc",
                ClientId = "pcc_api",
                ClientSecret = "secret",
                CallbackUri = "http://api.pcc.localhost/api/auth/callback",
                AppBaseUrl = "http://app.pcc.localhost",
                PostLogoutRedirectUri = "http://app.pcc.localhost",
            },
        });
        return (new KeycloakClient(new HttpClient(handler), options), handler);
    }

    private static HttpResponseMessage Json(string body, HttpStatusCode code = HttpStatusCode.OK) =>
        new(code) { Content = new StringContent(body, Encoding.UTF8, "application/json") };

    private sealed class StubHandler(HttpResponseMessage response) : HttpMessageHandler
    {
        public string? LastUri { get; private set; }
        public string LastBody { get; private set; } = "";

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            LastUri = request.RequestUri?.ToString();
            if (request.Content is not null)
            {
                LastBody = await request.Content.ReadAsStringAsync(cancellationToken);
            }

            return response;
        }
    }
}
