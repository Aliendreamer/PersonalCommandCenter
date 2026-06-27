using System.Net;
using Microsoft.Extensions.Options;
using Pcc.Plugins.Network;

namespace CoreApi.Tests;

public class NetworkClientTests
{
    [Fact]
    public async Task Maps_router_device_trackers_to_devices()
    {
        const string json = """
            [
              {
                "entity_id": "device_tracker.phone",
                "state": "home",
                "attributes": {
                  "source_type": "router",
                  "friendly_name": "My Phone",
                  "ip": "192.168.1.50",
                  "mac": "AA:BB:CC:11:22:33"
                }
              },
              {
                "entity_id": "device_tracker.gps_tracker",
                "state": "not_home",
                "attributes": {
                  "source_type": "gps",
                  "friendly_name": "GPS Device"
                }
              }
            ]
            """;

        var client = MakeClient(json);

        var status = await client.GetStatusAsync();

        Assert.Single(status.Devices);
        Assert.Equal("My Phone", status.Devices[0].Name);
    }

    [Fact]
    public async Task Groups_node_sensors_into_nodes()
    {
        const string json = """
            [
              {
                "entity_id": "sensor.deco_main_cpu_usage",
                "state": "0.15",
                "attributes": {
                  "friendly_name": "Deco Main CPU usage"
                }
              },
              {
                "entity_id": "sensor.deco_main_memory_usage",
                "state": "0.45",
                "attributes": {
                  "friendly_name": "Deco Main Memory usage"
                }
              }
            ]
            """;

        var client = MakeClient(json);

        var status = await client.GetStatusAsync();

        Assert.Single(status.Nodes);
        var node = status.Nodes[0];
        Assert.NotNull(node.CpuPct);
        Assert.NotNull(node.MemPct);
        Assert.True(Math.Abs(node.CpuPct!.Value - 15.0) < 0.01, $"CpuPct expected ~15.0 but was {node.CpuPct}");
        Assert.True(Math.Abs(node.MemPct!.Value - 45.0) < 0.01, $"MemPct expected ~45.0 but was {node.MemPct}");
    }

    private static NetworkClient MakeClient(string jsonResponse)
    {
        var handler = new FakeHandler(jsonResponse);
        var http = new HttpClient(handler);
        var opts = Options.Create(new NetworkOptions
        {
            HomeAssistant = new HomeAssistantOptions { BaseUrl = "http://test.local", Token = "tok" },
            NodeEntityPrefix = "deco",
        });
        return new NetworkClient(http, opts);
    }

    private sealed class FakeHandler(string json) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken ct)
        {
            var response = new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json, System.Text.Encoding.UTF8, "application/json"),
            };
            return Task.FromResult(response);
        }
    }
}
