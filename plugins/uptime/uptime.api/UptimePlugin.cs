using FastEndpoints;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Pcc.Plugins.Uptime;

/// <summary>Read-only service health board — HTTP-pings configured targets.</summary>
public sealed class UptimePlugin : IPlugin
{
    public string Id => "uptime";

    public PluginManifest Manifest { get; } = new("uptime", "Uptime", "/uptime", ["uptime-status"]);

    public void Configure(IServiceCollection services, IConfiguration config)
    {
        services.Configure<UptimeOptions>(config);
        services.AddHttpClient<IUptimeClient, HttpUptimeClient>();
    }
}

/// <summary><c>GET /api/uptime</c> — per-target up/down + latency (a down target is data, not an error).</summary>
internal sealed class GetUptimeEndpoint : EndpointWithoutRequest<IReadOnlyList<UptimeCheck>>
{
    public override void Configure() => Get("/uptime");

    public override async Task HandleAsync(CancellationToken ct)
    {
        var client = Resolve<IUptimeClient>();
        try
        {
            await Send.OkAsync(await client.CheckAllAsync(ct), ct);
        }
        catch (Exception) when (!ct.IsCancellationRequested)
        {
            // A real upstream failure degrades to 502; a client-cancelled request propagates.
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status502BadGateway));
        }
    }
}
