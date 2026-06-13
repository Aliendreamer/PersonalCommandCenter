using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace CoreApi.Tests.Auth;

public class AuthEndpointsTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory = factory;

    [Fact]
    public async Task Login_redirects_to_keycloak_and_sets_pkce_cookie()
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

        var response = await client.GetAsync("/api/auth/login?returnTo=/devices");

        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        Assert.Contains(response.Headers.GetValues("Set-Cookie"), c => c.StartsWith("mp_pkce="));
        var location = response.Headers.Location!.ToString();
        Assert.Contains("response_type=code", location);
        Assert.Contains("code_challenge_method=S256", location);
        Assert.Contains("state=", location);
    }

    [Fact]
    public async Task Me_returns_401_when_anonymous()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Logout_redirects_to_end_session()
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

        var response = await client.GetAsync("/api/auth/logout");

        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        Assert.Contains("protocol/openid-connect/logout", response.Headers.Location!.ToString());
    }
}
