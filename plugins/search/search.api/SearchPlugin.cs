using FastEndpoints;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Pcc.Plugins.Search;

/// <summary>Read-only metasearch plugin: queries a self-hosted SearXNG.</summary>
public sealed class SearchPlugin : IPlugin
{
    public string Id => "search";

    public PluginManifest Manifest { get; } = new("search", "Search", "/search", ["search-box"]);

    public void Configure(IServiceCollection services, IConfiguration config)
    {
        services.Configure<SearchOptions>(config);
        services.AddHttpClient<ISearchClient, SearxngClient>();
    }
}

/// <summary><c>GET /api/search?q=…</c> — metasearch results for the query.</summary>
internal sealed class SearchEndpoint : EndpointWithoutRequest<IReadOnlyList<SearchResult>>
{
    public override void Configure() => Get("/search");

    public override async Task HandleAsync(CancellationToken ct)
    {
        var query = Query<string?>("q", isRequired: false);
        if (string.IsNullOrWhiteSpace(query))
        {
            await Send.ResultAsync(Results.BadRequest(new { error = "q is required" }));
            return;
        }

        var client = Resolve<ISearchClient>();
        try
        {
            var results = await client.SearchAsync(query, ct);
            await Send.OkAsync(results, ct);
        }
        catch (Exception)
        {
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status502BadGateway));
        }
    }
}
