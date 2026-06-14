using FastEndpoints;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Pcc.Plugins.Rss;

/// <summary>Read-only RSS/Atom feed aggregator.</summary>
public sealed class RssPlugin : IPlugin
{
    public string Id => "rss";

    public PluginManifest Manifest { get; } = new("rss", "Feeds", "/rss", ["rss-latest"]);

    public void Configure(IServiceCollection services, IConfiguration config)
    {
        services.Configure<RssOptions>(config);
        services.AddHttpClient<IFeedClient, RssClient>();
    }
}

/// <summary><c>GET /api/rss</c> — newest items aggregated across the configured feeds.</summary>
internal sealed class GetRssEndpoint : EndpointWithoutRequest<IReadOnlyList<RssItem>>
{
    public override void Configure() => Get("/rss");

    public override async Task HandleAsync(CancellationToken ct)
    {
        var client = Resolve<IFeedClient>();
        try
        {
            await Send.OkAsync(await client.GetItemsAsync(ct), ct);
        }
        catch (Exception)
        {
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status502BadGateway));
        }
    }
}
