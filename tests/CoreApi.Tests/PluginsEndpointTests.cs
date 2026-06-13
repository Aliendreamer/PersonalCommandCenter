using System.Net;
using System.Net.Http.Json;
using CoreApi.Tests.Auth;
using Microsoft.AspNetCore.Mvc.Testing;

namespace CoreApi.Tests;

public class PluginsEndpointTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory = factory;

    [Fact]
    public async Task Lists_enabled_plugins_when_authenticated()
    {
        var client = _factory.AuthedClient();

        var manifests = await client.GetFromJsonAsync<List<ManifestDto>>("/api/plugins");

        Assert.NotNull(manifests);
        Assert.Contains(manifests, m => m.Id == "system");
    }

    [Fact]
    public async Task Requires_authentication()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/plugins");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Omits_disabled_plugins()
    {
        Environment.SetEnvironmentVariable("Plugins__System__Enabled", "false");
        try
        {
            await using var factory = new WebApplicationFactory<Program>();
            var client = factory.AuthedClient();

            var manifests = await client.GetFromJsonAsync<List<ManifestDto>>("/api/plugins");

            Assert.NotNull(manifests);
            Assert.DoesNotContain(manifests, m => m.Id == "system");
        }
        finally
        {
            Environment.SetEnvironmentVariable("Plugins__System__Enabled", null);
        }
    }

    private sealed record ManifestDto(string Id, string NavLabel, string RouteBase, List<string> Widgets);
}
