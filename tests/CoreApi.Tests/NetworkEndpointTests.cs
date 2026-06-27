using System.Net;
using System.Net.Http.Json;
using CoreApi.Tests.Auth;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Pcc.Plugins.Network;

namespace CoreApi.Tests;

public class NetworkEndpointTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory = factory;

    [Fact]
    public async Task Returns_network_status()
    {
        var status = new NetworkStatus(
            new List<NetworkDevice>
            {
                new("Router", "192.168.1.1", "AA:BB:CC:DD:EE:FF", true, "wired", null, null, null),
                new("Phone", "192.168.1.100", null, true, "wireless_5_ghz", 10.5, 2.3, -55),
            },
            new List<NetworkNode>
            {
                new("Deco Main", true, 15.0, 45.0, 8, 100.0, 50.0),
            });

        var client = AuthedWithNetwork(new FakeClient(status));

        var result = await client.GetFromJsonAsync<NetworkStatusDto>("/api/network");

        Assert.NotNull(result);
        Assert.Equal(2, result.Devices.Length);
        Assert.Single(result.Nodes);
    }

    [Fact]
    public async Task Returns_502_when_ha_fails()
    {
        var client = AuthedWithNetwork(new ThrowingClient());

        var response = await client.GetAsync("/api/network");

        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
    }

    [Fact]
    public async Task Requires_authentication()
    {
        var response = await _factory.CreateClient().GetAsync("/api/network");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Returns_empty_when_no_devices()
    {
        var status = new NetworkStatus([], []);
        var client = AuthedWithNetwork(new FakeClient(status));

        var result = await client.GetFromJsonAsync<NetworkStatusDto>("/api/network");

        Assert.NotNull(result);
        Assert.Empty(result.Devices);
        Assert.Empty(result.Nodes);
    }

    [Fact]
    public async Task Absent_when_disabled()
    {
        Environment.SetEnvironmentVariable("Plugins__Network__Enabled", "false");
        try
        {
            await using var disabledFactory = new WebApplicationFactory<Program>();
            var client = disabledFactory.AuthedClient();

            var networkResponse = await client.GetAsync("/api/network");
            var plugins = await client.GetFromJsonAsync<List<PluginDto>>("/api/plugins");

            Assert.Equal(HttpStatusCode.NotFound, networkResponse.StatusCode);
            Assert.NotNull(plugins);
            Assert.DoesNotContain(plugins, p => p.Id == "network");
        }
        finally
        {
            Environment.SetEnvironmentVariable("Plugins__Network__Enabled", null);
        }
    }

    private HttpClient AuthedWithNetwork(INetworkClient networkClient)
    {
        var client = _factory.Authed(s => s.AddSingleton(networkClient)).CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.Header, "1");
        return client;
    }

    private sealed record NetworkStatusDto(NetworkDeviceDto[] Devices, NetworkNodeDto[] Nodes);

    private sealed record NetworkDeviceDto(string Name, string? Ip, string? Mac, bool Home, string? ConnectionType);

    private sealed record NetworkNodeDto(string Name, bool Online);

    private sealed record PluginDto(string Id);

    private sealed class FakeClient(NetworkStatus status) : INetworkClient
    {
        public Task<NetworkStatus> GetStatusAsync(CancellationToken ct = default) => Task.FromResult(status);
    }

    private sealed class ThrowingClient : INetworkClient
    {
        public Task<NetworkStatus> GetStatusAsync(CancellationToken ct = default) =>
            throw new HttpRequestException("HA unreachable");
    }
}
