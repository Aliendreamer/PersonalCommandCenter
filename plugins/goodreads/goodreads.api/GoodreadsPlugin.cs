using FastEndpoints;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Pcc.Plugins.Goodreads;

/// <summary>Read-only Goodreads shelf plugin (via the shelf RSS feed — the API is retired).</summary>
public sealed class GoodreadsPlugin : IPlugin
{
    public string Id => "goodreads";

    public PluginManifest Manifest { get; } =
        new("goodreads", "Reading", "/goodreads", ["goodreads-reading"]);

    public void Configure(IServiceCollection services, IConfiguration config)
    {
        services.Configure<GoodreadsOptions>(config);
        services.AddHttpClient<IGoodreadsClient, GoodreadsClient>();
    }
}

/// <summary><c>GET /api/goodreads</c> — the configured shelf's books.</summary>
internal sealed class GetGoodreadsEndpoint : EndpointWithoutRequest<IReadOnlyList<Book>>
{
    public override void Configure() => Get("/goodreads");

    public override async Task HandleAsync(CancellationToken ct)
    {
        var client = Resolve<IGoodreadsClient>();
        try
        {
            await Send.OkAsync(await client.GetShelfAsync(ct), ct);
        }
        catch (Exception) when (!ct.IsCancellationRequested)
        {
            // A real upstream failure degrades to 502; a client-cancelled request propagates.
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status502BadGateway));
        }
    }
}
