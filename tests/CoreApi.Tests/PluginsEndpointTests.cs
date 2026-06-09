using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace CoreApi.Tests;

public class PluginsEndpointTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory = factory;

    [Fact]
    public async Task Lists_enabled_plugins()
    {
        var client = _factory.CreateClient();

        var manifests = await client.GetFromJsonAsync<List<ManifestDto>>("/api/plugins");

        Assert.NotNull(manifests);
        Assert.Contains(manifests, m => m.Id == "system");
    }

    [Fact]
    public async Task Omits_disabled_plugins()
    {
        // Activation runs at builder time, before WebApplicationFactory's ConfigureAppConfiguration
        // would apply. CreateBuilder reads environment variables early, so override there.
        Environment.SetEnvironmentVariable("Plugins__System__Enabled", "false");
        try
        {
            await using var factory = new WebApplicationFactory<Program>();
            var client = factory.CreateClient();

            var manifests = await client.GetFromJsonAsync<List<ManifestDto>>("/api/plugins");

            Assert.NotNull(manifests);
            Assert.DoesNotContain(manifests, m => m.Id == "system");
        }
        finally
        {
            Environment.SetEnvironmentVariable("Plugins__System__Enabled", null);
        }
    }

    private sealed record ManifestDto(
        string Id,
        string NavLabel,
        string RouteBase,
        List<string> Widgets);
}
