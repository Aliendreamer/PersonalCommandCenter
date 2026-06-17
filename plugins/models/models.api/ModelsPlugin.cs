using FastEndpoints;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Pcc.Plugins.Models;

/// <summary>Read-only Ollama models + GPU telemetry board.</summary>
public sealed class ModelsPlugin : IPlugin
{
    public string Id => "models";

    public PluginManifest Manifest { get; } = new("models", "Models", "/models", ["models-status"]);

    public void Configure(IServiceCollection services, IConfiguration config)
    {
        services.Configure<ModelsOptions>(config);
        services.AddHttpClient<IModelsClient, ModelsClient>();
    }
}

/// <summary><c>GET /api/models</c> — Ollama inventory + GPU telemetry (Ollama down → 502; GPU down → empty gpus).</summary>
internal sealed class GetModelsEndpoint : EndpointWithoutRequest<ModelsStatus>
{
    public override void Configure() => Get("/models");

    public override async Task HandleAsync(CancellationToken ct)
    {
        var client = Resolve<IModelsClient>();
        try
        {
            await Send.OkAsync(await client.GetStatusAsync(ct), ct);
        }
        catch (Exception)
        {
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status502BadGateway));
        }
    }
}
