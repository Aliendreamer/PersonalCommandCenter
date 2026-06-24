using FastEndpoints;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Pcc.Plugins.Rss;

/// <summary>Read-only RSS/Atom feed aggregator with a Redis-cached, hourly-refreshed result.</summary>
public sealed class RssPlugin : IPlugin
{
    public string Id => "rss";

    public PluginManifest Manifest { get; } = new("rss", "Feeds", "/rss", ["rss-latest"]);

    public void Configure(IServiceCollection services, IConfiguration config)
    {
        services.Configure<RssOptions>(config);
        services.AddHttpClient<IFeedClient, RssClient>();
        services.AddScoped<RssFeedCache>();
        services.AddHostedService<RssRefreshService>();
    }
}

/// <summary><c>GET /api/rss?refresh=&lt;bool&gt;</c> — cached aggregate; refresh forces a live pull.</summary>
internal sealed class GetRssEndpoint : EndpointWithoutRequest<IReadOnlyList<RssItem>>
{
    public override void Configure() => Get("/rss");

    public override async Task HandleAsync(CancellationToken ct)
    {
        var cache = Resolve<RssFeedCache>();
        var refresh = Query<bool>("refresh", isRequired: false);
        try
        {
            var items = refresh ? await cache.RefreshAsync(ct) : await cache.GetAsync(ct);
            await Send.OkAsync(items, ct);
        }
        catch (Exception)
        {
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status502BadGateway));
        }
    }
}
