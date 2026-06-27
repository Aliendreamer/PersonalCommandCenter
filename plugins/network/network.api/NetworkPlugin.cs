using FastEndpoints;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Pcc.Plugins.Network;

/// <summary>
/// Network plugin: reads TP-Link Deco data from Home Assistant (ha-tplink-deco integration).
/// </summary>
public sealed class NetworkPlugin : IPlugin
{
    public string Id => "network";

    public PluginManifest Manifest { get; } = new("network", "Network", "/network", ["network-devices"]);

    public void Configure(IServiceCollection services, IConfiguration config)
    {
        services.Configure<NetworkOptions>(config);
        services.AddHttpClient<INetworkClient, NetworkClient>();
    }
}

/// <summary><c>GET /api/network</c> — registered by the host only when the plugin is enabled.</summary>
internal sealed class GetNetworkStatusEndpoint : EndpointWithoutRequest<NetworkStatus>
{
    public override void Configure()
    {
        Get("/network");
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var client = Resolve<INetworkClient>();
        try
        {
            var status = await client.GetStatusAsync(ct);
            await Send.OkAsync(status, ct);
        }
        catch (Exception)
        {
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status502BadGateway));
        }
    }
}
