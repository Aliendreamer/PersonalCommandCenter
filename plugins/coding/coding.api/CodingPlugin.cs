using FastEndpoints;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Pcc.Plugins.Coding;

/// <summary>Read-only coding-activity board backed by the internal Wakapi instance.</summary>
public sealed class CodingPlugin : IPlugin
{
    public string Id => "coding";

    public PluginManifest Manifest { get; } = new("coding", "Coding", "/coding", ["coding-status"]);

    public void Configure(IServiceCollection services, IConfiguration config)
    {
        services.Configure<CodingOptions>(config);
        services.AddHttpClient<ICodingClient, CodingClient>();
    }
}

/// <summary><c>GET /api/coding?range=week|month|year</c> — coding summary from Wakapi (unreachable/unconfigured → 502).</summary>
internal sealed class GetCodingEndpoint : EndpointWithoutRequest<CodingStatus>
{
    private static readonly string[] Ranges = ["week", "month", "year"];

    public override void Configure() => Get("/coding");

    public override async Task HandleAsync(CancellationToken ct)
    {
        var requested = Query<string?>("range", isRequired: false);
        var range = requested is not null && Ranges.Contains(requested, StringComparer.OrdinalIgnoreCase)
            ? requested.ToLowerInvariant()
            : "week";

        var client = Resolve<ICodingClient>();
        try
        {
            await Send.OkAsync(await client.GetStatusAsync(range, ct), ct);
        }
        catch (Exception)
        {
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status502BadGateway));
        }
    }
}
