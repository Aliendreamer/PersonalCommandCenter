using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Pcc.Plugins;

namespace Pcc.Plugins.Iot;

/// <summary>
/// Read-only IoT plugin: lists Home Assistant entities (filtered domains) for the dashboard.
/// </summary>
public sealed class IotPlugin : IPlugin
{
    public string Id => "iot";

    public PluginManifest Manifest { get; } = new("iot", "Devices", "/devices", ["iot-summary"]);

    public void Configure(IServiceCollection services, IConfiguration config)
    {
        services.Configure<IotOptions>(config);
        services.AddHttpClient<IHomeAssistantClient, HomeAssistantClient>();
    }

    public void MapEndpoints(IEndpointRouteBuilder endpoints) =>
        endpoints.MapGet(
            "/api/iot/entities",
            async (IHomeAssistantClient client, CancellationToken cancellationToken) =>
            {
                try
                {
                    return Results.Ok(await client.GetEntitiesAsync(cancellationToken));
                }
                catch (Exception)
                {
                    // HA unreachable/misconfigured — surface as a gateway error; the UI degrades.
                    return Results.StatusCode(StatusCodes.Status502BadGateway);
                }
            });
}
