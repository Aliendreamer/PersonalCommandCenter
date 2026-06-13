using System.Net;
using System.Net.Http.Json;
using CoreApi.Tests.Auth;
using Microsoft.AspNetCore.Mvc.Testing;

namespace CoreApi.Tests;

public class SystemStatusTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory = factory;

    [Fact]
    public async Task Status_returns_health_data_when_authenticated()
    {
        var client = _factory.AuthedClient();

        var status = await client.GetFromJsonAsync<StatusDto>("/api/system/status");

        Assert.NotNull(status);
        Assert.True(status.ApiHealthy);
        Assert.False(string.IsNullOrWhiteSpace(status.Version));
        Assert.False(string.IsNullOrWhiteSpace(status.Hostname));
    }

    [Fact]
    public async Task Status_requires_authentication()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/system/status");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Status_unavailable_when_plugin_disabled()
    {
        Environment.SetEnvironmentVariable("Plugins__System__Enabled", "false");
        try
        {
            await using var factory = new WebApplicationFactory<Program>();
            var client = factory.AuthedClient();

            var response = await client.GetAsync("/api/system/status");

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }
        finally
        {
            Environment.SetEnvironmentVariable("Plugins__System__Enabled", null);
        }
    }

    private sealed record StatusDto(bool ApiHealthy, string Version, double UptimeSeconds, string Hostname);
}
