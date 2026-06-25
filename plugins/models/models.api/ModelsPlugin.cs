using System.Text;
using System.Text.Json;
using FastEndpoints;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using ZiggyCreatures.Caching.Fusion;

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
        services.AddHttpClient<IOllamaInferenceClient, OllamaInferenceClient>();
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

/// <summary><c>POST /api/models/compare</c> — Fan out a prompt to multiple models, return all results.</summary>
internal sealed class CompareEndpoint : Endpoint<CompareRequest, IReadOnlyList<CompareResult>>
{
    public override void Configure() => Post("/models/compare");

    public override async Task HandleAsync(CompareRequest req, CancellationToken ct)
    {
        if (req is null || req.Models is null || req.Models.Length == 0 || string.IsNullOrWhiteSpace(req.Prompt))
        {
            await Send.ResultAsync(Results.BadRequest("Prompt and at least one model are required."));
            return;
        }

        if (req.Models.Length > 8)
        {
            await Send.ResultAsync(Results.BadRequest("At most 8 models may be compared at once."));
            return;
        }

        var inference = Resolve<IOllamaInferenceClient>();

        var tasks = req.Models.Select(model => Task.Run(async () =>
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(60));
            using var linked = CancellationTokenSource.CreateLinkedTokenSource(cts.Token, ct);
            try
            {
                return await inference.GenerateAsync(model, req.Prompt, linked.Token);
            }
            catch (Exception ex)
            {
                return new CompareResult(model, null, ex.Message, 0);
            }
        }, ct)).ToArray();

        var results = await Task.WhenAll(tasks);

        if (results.All(r => r.Error is not null))
        {
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status502BadGateway));
            return;
        }

        await Send.OkAsync(results, ct);
    }
}

/// <summary><c>GET /api/models/library</c> — Curated model catalogue with GPU-fit annotation.</summary>
internal sealed class LibraryEndpoint : EndpointWithoutRequest<IReadOnlyList<CatalogueEntry>>
{
    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };

    public override void Configure() => Get("/models/library");

    public override async Task HandleAsync(CancellationToken ct)
    {
        var cache = Resolve<IFusionCache>();
        var options = Resolve<IOptions<ModelsOptions>>().Value;

        // Cache only the raw catalogue (static data, 24 h TTL).
        // GPU-fit annotation is computed per-request so it reflects current VRAM.
        var raw = await cache.GetOrSetAsync<IReadOnlyList<LibraryEntryRaw>>(
            "models:library:raw",
            async (_, innerCt) => await LoadRawCatalogueAsync(innerCt),
            new FusionCacheEntryOptions(TimeSpan.FromHours(options.Ollama.LibraryCacheHours)),
            ct);

        // Resolve IModelsClient here (on the request thread) — safe for HttpContext access.
        double? gpuTotalMb = null;
        try
        {
            var modelsClient = Resolve<IModelsClient>();
            var status = await modelsClient.GetStatusAsync(ct);
            if (status.Gpus is { Count: > 0 })
            {
                gpuTotalMb = status.Gpus[0].MemoryTotalMb;
            }
        }
        catch (Exception)
        {
            // GPU exporter down — fits will be "unknown", catalogue still returns.
        }

        var entries = raw.Select(r => new CatalogueEntry(
            r.Name,
            r.Description,
            r.ParameterSize,
            r.Quantization,
            r.SizeGb,
            r.Family,
            r.Tags,
            ComputeFits(r.SizeGb, gpuTotalMb))).ToList();

        await Send.OkAsync(entries, ct);
    }

    private static async Task<IReadOnlyList<LibraryEntryRaw>> LoadRawCatalogueAsync(CancellationToken ct)
    {
        var asm = typeof(ModelsPlugin).Assembly;
        var resourceName = asm.GetManifestResourceNames()
            .First(n => n.EndsWith("ModelLibrary.json", StringComparison.Ordinal));
        await using var stream = asm.GetManifestResourceStream(resourceName)!;
        return await JsonSerializer.DeserializeAsync<List<LibraryEntryRaw>>(stream, Json, ct) ?? [];
    }

    private static string ComputeFits(double sizeGb, double? gpuTotalMb)
    {
        if (gpuTotalMb is null or 0)
        {
            return "unknown";
        }

        var requiredMb = sizeGb * 1.1 * 1024;
        if (requiredMb <= gpuTotalMb.Value * 0.9)
        {
            return "yes";
        }

        if (requiredMb <= gpuTotalMb.Value)
        {
            return "marginal";
        }

        return "no";
    }

    private sealed record LibraryEntryRaw(
        string Name,
        string Description,
        string ParameterSize,
        string Quantization,
        double SizeGb,
        string Family,
        string[] Tags);
}

/// <summary><c>POST /api/models/pull</c> — Pull a model from Ollama's registry (blocks until complete).</summary>
internal sealed class PullModelEndpoint : Endpoint<PullRequest>
{
    public override void Configure() => Post("/models/pull");

    public override async Task HandleAsync(PullRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
        {
            await Send.ResultAsync(Results.BadRequest("Model name is required."));
            return;
        }

        var inference = Resolve<IOllamaInferenceClient>();
        try
        {
            await inference.PullAsync(req.Name, ct);
            await Send.NoContentAsync(ct);
        }
        catch (HttpRequestException)
        {
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status502BadGateway));
        }
    }
}

internal sealed record PullRequest(string Name);

/// <summary><c>DELETE /api/models/{name}</c> — Delete a model from Ollama.</summary>
internal sealed class DeleteModelEndpoint : EndpointWithoutRequest
{
    public override void Configure() => Delete("/models/{name}");

    public override async Task HandleAsync(CancellationToken ct)
    {
        var name = Uri.UnescapeDataString(Route<string>("name")!);
        var options = Resolve<IOptions<ModelsOptions>>().Value;
        var baseUrl = options.Ollama.BaseUrl.TrimEnd('/');

        var httpFactory = Resolve<IHttpClientFactory>();
        var http = httpFactory.CreateClient("models-delete");

        var body = JsonSerializer.Serialize(new { model = name });
        using var request = new HttpRequestMessage(System.Net.Http.HttpMethod.Delete, new Uri($"{baseUrl}/api/delete"))
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json"),
        };

        HttpResponseMessage response;
        try
        {
            response = await http.SendAsync(request, ct);
        }
        catch (HttpRequestException)
        {
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status502BadGateway));
            return;
        }

        if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            await Send.ResultAsync(Results.NotFound());
            return;
        }

        if (!response.IsSuccessStatusCode)
        {
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status502BadGateway));
            return;
        }

        await Send.ResultAsync(Results.NoContent());
    }
}
