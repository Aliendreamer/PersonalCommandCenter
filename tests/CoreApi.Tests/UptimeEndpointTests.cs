using System.Net;
using System.Net.Http.Json;
using CoreApi.Tests.Auth;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Pcc.Plugins.Uptime;

namespace CoreApi.Tests;

public class UptimeEndpointTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory = factory;

    [Fact]
    public async Task Returns_up_and_down_targets_with_200()
    {
        var client = AuthedWith(new FakeUptime([
            new UptimeCheck("api", "https://api.test", true, 200, 12),
            new UptimeCheck("down", "https://down.test", false, null, 5000),
        ]));

        var checks = await client.GetFromJsonAsync<List<CheckDto>>("/api/uptime");

        Assert.NotNull(checks);
        Assert.Contains(checks!, c => c.Name == "api" && c.Up);
        Assert.Contains(checks!, c => c.Name == "down" && !c.Up);
    }

    [Fact]
    public async Task Requires_authentication()
    {
        var response = await _factory.CreateClient().GetAsync("/api/uptime");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Returns_502_when_no_targets_configured()
    {
        var client = AuthedWith(new ThrowingUptime());
        var response = await client.GetAsync("/api/uptime");
        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
    }

    [Fact]
    public async Task Absent_when_disabled()
    {
        Environment.SetEnvironmentVariable("Plugins__Uptime__Enabled", "false");
        try
        {
            await using var factory = new WebApplicationFactory<Program>();
            var client = factory.AuthedClient();

            var response = await client.GetAsync("/api/uptime");
            var plugins = await client.GetFromJsonAsync<List<PluginDto>>("/api/plugins");

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
            Assert.DoesNotContain(plugins!, p => p.Id == "uptime");
        }
        finally
        {
            Environment.SetEnvironmentVariable("Plugins__Uptime__Enabled", null);
        }
    }

    private HttpClient AuthedWith(IUptimeClient uptime)
    {
        var client = _factory.Authed(s => s.AddSingleton(uptime)).CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.Header, "1");
        return client;
    }

    private sealed record CheckDto(string Name, string Url, bool Up, int? StatusCode, long LatencyMs);

    private sealed record PluginDto(string Id);

    private sealed class FakeUptime(IReadOnlyList<UptimeCheck> checks) : IUptimeClient
    {
        public Task<IReadOnlyList<UptimeCheck>> CheckAllAsync(CancellationToken ct = default) =>
            Task.FromResult(checks);
    }

    private sealed class ThrowingUptime : IUptimeClient
    {
        public Task<IReadOnlyList<UptimeCheck>> CheckAllAsync(CancellationToken ct = default) =>
            throw new InvalidOperationException("no targets");
    }
}
