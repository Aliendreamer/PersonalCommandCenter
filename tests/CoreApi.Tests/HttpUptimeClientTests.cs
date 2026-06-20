using System.Net;
using Microsoft.Extensions.Options;
using Pcc.Plugins.Uptime;

namespace CoreApi.Tests;

public class HttpUptimeClientTests
{
    [Fact]
    public async Task Reports_up_for_a_2xx_target_with_latency_and_status()
    {
        var client = Create(new RoutingHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)),
            new UptimeTarget { Name = "api", Url = "https://api.test/health" });

        var check = Assert.Single(await client.CheckAllAsync());

        Assert.Equal("api", check.Name);
        Assert.True(check.Up);
        Assert.Equal(200, check.StatusCode);
        Assert.True(check.LatencyMs >= 0);
    }

    [Fact]
    public async Task Reports_down_with_status_for_a_4xx_target()
    {
        var client = Create(new RoutingHandler(_ => new HttpResponseMessage(HttpStatusCode.NotFound)),
            new UptimeTarget { Name = "api", Url = "https://api.test/health" });

        var check = Assert.Single(await client.CheckAllAsync());

        Assert.False(check.Up);
        Assert.Equal(404, check.StatusCode);
    }

    [Fact]
    public async Task Reports_down_without_status_when_the_request_throws()
    {
        var client = Create(new RoutingHandler(_ => throw new HttpRequestException("refused")),
            new UptimeTarget { Name = "down", Url = "https://down.test" });

        var check = Assert.Single(await client.CheckAllAsync());

        Assert.False(check.Up);
        Assert.Null(check.StatusCode);
    }

    [Fact]
    public async Task Checks_every_configured_target()
    {
        var client = Create(
            new RoutingHandler(req => new HttpResponseMessage(
                req.RequestUri!.Host == "up.test" ? HttpStatusCode.OK : HttpStatusCode.InternalServerError)),
            new UptimeTarget { Name = "up", Url = "https://up.test" },
            new UptimeTarget { Name = "bad", Url = "https://bad.test" });

        var checks = await client.CheckAllAsync();

        Assert.Equal(2, checks.Count);
        Assert.True(checks.Single(c => c.Name == "up").Up);
        Assert.False(checks.Single(c => c.Name == "bad").Up);
    }

    [Fact]
    public async Task Throws_when_no_targets_configured()
    {
        var client = new HttpUptimeClient(new HttpClient(new RoutingHandler(_ => new HttpResponseMessage())),
            Options.Create(new UptimeOptions()));
        await Assert.ThrowsAsync<InvalidOperationException>(() => client.CheckAllAsync());
    }

    [Fact]
    public async Task Reports_up_for_a_reachable_tcp_target()
    {
        // A tcp:// target is probed by opening a socket (for HTTP-less services like Postgres/Redis).
        using var listener = new System.Net.Sockets.TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        var port = ((IPEndPoint)listener.LocalEndpoint).Port;
        var client = Create(new RoutingHandler(_ => new HttpResponseMessage()),
            new UptimeTarget { Name = "db", Url = $"tcp://127.0.0.1:{port}" });

        var check = Assert.Single(await client.CheckAllAsync());

        Assert.True(check.Up);
        Assert.Null(check.StatusCode); // TCP probe has no HTTP status
        listener.Stop();
    }

    [Fact]
    public async Task Reports_down_for_an_unreachable_tcp_target()
    {
        // Bind then immediately release a port so nothing is listening on it.
        var probe = new System.Net.Sockets.TcpListener(IPAddress.Loopback, 0);
        probe.Start();
        var port = ((IPEndPoint)probe.LocalEndpoint).Port;
        probe.Stop();
        var client = Create(new RoutingHandler(_ => new HttpResponseMessage()),
            new UptimeTarget { Name = "db", Url = $"tcp://127.0.0.1:{port}" });

        var check = Assert.Single(await client.CheckAllAsync());

        Assert.False(check.Up);
        Assert.Null(check.StatusCode);
    }

    private static HttpUptimeClient Create(RoutingHandler handler, params UptimeTarget[] targets) =>
        new(new HttpClient(handler), Options.Create(new UptimeOptions { Targets = targets, TimeoutSeconds = 5 }));

    private sealed class RoutingHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct) =>
            Task.FromResult(respond(request));
    }
}
