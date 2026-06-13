using FastEndpoints;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

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
}

/// <summary><c>GET /api/iot/entities</c> — registered by the host only when the plugin is enabled.</summary>
internal sealed class GetIotEntitiesEndpoint : EndpointWithoutRequest<IReadOnlyList<IotEntity>>
{
    public override void Configure()
    {
        Get("/iot/entities");
    }

    // The client is resolved lazily (not constructor-injected) so the host can instantiate this
    // endpoint at startup to read its config even before the plugin's services are registered.
    public override async Task HandleAsync(CancellationToken ct)
    {
        var client = Resolve<IHomeAssistantClient>();
        try
        {
            var entities = await client.GetEntitiesAsync(ct);
            await Send.OkAsync(entities, ct);
        }
        catch (Exception)
        {
            // HA unreachable/misconfigured — surface as a gateway error; the UI degrades.
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status502BadGateway));
        }
    }
}
