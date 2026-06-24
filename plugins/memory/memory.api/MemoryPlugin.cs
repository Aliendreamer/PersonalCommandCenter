using FastEndpoints;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Pcc.Plugins.Memory;

/// <summary>Persistent, vector-searchable memory layer backed by Qdrant + Ollama embeddings.</summary>
public sealed class MemoryPlugin : IPlugin
{
    private const string Collection = "pcc_memory";

    public string Id => "memory";

    public PluginManifest Manifest { get; } = new("memory", "Memory", "/memory", ["memory-store"]);

    public void Configure(IServiceCollection services, IConfiguration config)
    {
        services.Configure<MemoryOptions>(config);
        services.AddHttpClient<IOllamaEmbeddingClient, OllamaEmbeddingClient>();
        services.AddHttpClient<IQdrantClient, QdrantClient>();
        services.AddHostedService<MemoryCollectionBootstrap>();
    }

    internal static string CollectionName => Collection;
}

/// <summary>Ensures the Qdrant collection exists at startup; swallows any failure (Qdrant may be down).</summary>
internal sealed class MemoryCollectionBootstrap(
    IQdrantClient qdrant,
    IOptions<MemoryOptions> options,
    ILogger<MemoryCollectionBootstrap> logger) : IHostedService
{
    public async Task StartAsync(CancellationToken ct)
    {
        try
        {
            await qdrant.EnsureCollectionAsync(MemoryPlugin.CollectionName, options.Value.VectorSize, ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Could not ensure Qdrant collection '{Collection}' at startup — individual requests will 502 if Qdrant remains unreachable.", MemoryPlugin.CollectionName);
        }
    }

    public Task StopAsync(CancellationToken ct) => Task.CompletedTask;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

/// <summary><c>POST /api/memory</c> — store a memory. Body: <c>{ content, tags? }</c>.</summary>
internal sealed class StoreMemoryEndpoint : Endpoint<StoreMemoryRequest, StoreMemoryResponse>
{
    public override void Configure() => Post("/memory");

    public override async Task HandleAsync(StoreMemoryRequest req, CancellationToken ct)
    {
        var ollama = Resolve<IOllamaEmbeddingClient>();
        var qdrant = Resolve<IQdrantClient>();
        var opts = Resolve<IOptions<MemoryOptions>>().Value;

        try
        {
            var id = Guid.NewGuid();
            var vector = await ollama.EmbedAsync(opts.EmbeddingModel, req.Content, ct);
            var item = new MemoryItem(id, req.Content, req.Tags ?? [], DateTimeOffset.UtcNow);
            await qdrant.UpsertAsync(MemoryPlugin.CollectionName, id, vector, item, ct);
            await Send.CreatedAtAsync<StoreMemoryEndpoint>(new { }, new StoreMemoryResponse(id), cancellation: ct);
        }
        catch (Exception)
        {
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status502BadGateway));
        }
    }
}

internal sealed record StoreMemoryRequest(string Content, string[]? Tags);

internal sealed record StoreMemoryResponse(Guid Id);

/// <summary><c>GET /api/memory?q=…&amp;limit=n</c> — search (with q) or scroll recent (without q).</summary>
internal sealed class RecallMemoryEndpoint : EndpointWithoutRequest<IReadOnlyList<MemoryEntry>>
{
    public override void Configure() => Get("/memory");

    public override async Task HandleAsync(CancellationToken ct)
    {
        var ollama = Resolve<IOllamaEmbeddingClient>();
        var qdrant = Resolve<IQdrantClient>();
        var opts = Resolve<IOptions<MemoryOptions>>().Value;

        var q = Query<string?>("q", isRequired: false);
        var limitRaw = Query<string?>("limit", isRequired: false);
        var limit = int.TryParse(limitRaw, out var l) && l > 0 ? l : opts.DefaultRecallLimit;

        try
        {
            IReadOnlyList<MemoryEntry> results;
            if (!string.IsNullOrWhiteSpace(q))
            {
                var vector = await ollama.EmbedAsync(opts.EmbeddingModel, q, ct);
                results = await qdrant.SearchAsync(MemoryPlugin.CollectionName, vector, limit, ct);
            }
            else
            {
                results = await qdrant.ScrollAsync(MemoryPlugin.CollectionName, limit, ct);
            }

            await Send.OkAsync(results, ct);
        }
        catch (Exception)
        {
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status502BadGateway));
        }
    }
}

/// <summary><c>DELETE /api/memory/{id}</c> — delete a memory by id.</summary>
internal sealed class DeleteMemoryEndpoint : EndpointWithoutRequest
{
    public override void Configure() => Delete("/memory/{id}");

    public override async Task HandleAsync(CancellationToken ct)
    {
        var idStr = Route<string>("id");
        if (!Guid.TryParse(idStr, out var id))
        {
            await Send.ResultAsync(Results.BadRequest(new { error = "id must be a valid GUID" }));
            return;
        }

        var qdrant = Resolve<IQdrantClient>();
        try
        {
            await qdrant.DeleteAsync(MemoryPlugin.CollectionName, id, ct);
            await Send.NoContentAsync(ct);
        }
        catch (Exception)
        {
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status502BadGateway));
        }
    }
}
