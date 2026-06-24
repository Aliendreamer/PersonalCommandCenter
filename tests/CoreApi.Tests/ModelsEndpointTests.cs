using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using CoreApi.Tests.Auth;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Pcc.Plugins.Models;

namespace CoreApi.Tests;

public class ModelsEndpointTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory = factory;

    private static ModelsStatus Sample(bool withGpu) => new(
        "0.30.9",
        [new InstalledModel("llama3:latest", 4661211808, "llama", "8B", "Q4_0")],
        [new RunningModel("llama3:latest", 5137025024)],
        withGpu ? [new GpuStat("RTX 5070", 15, 52, 2048, 8192)] : []);

    // ── Existing tests ────────────────────────────────────────────────────────

    [Fact]
    public async Task Returns_models_and_gpu()
    {
        var client = AuthedWith(new FakeModels(Sample(withGpu: true)));

        var status = await client.GetFromJsonAsync<StatusDto>("/api/models");

        Assert.NotNull(status);
        Assert.Equal("0.30.9", status!.Version);
        Assert.Contains(status.Installed, m => m.Name == "llama3:latest");
        Assert.Single(status.Gpus);
    }

    [Fact]
    public async Task Gpu_down_still_returns_200_with_models()
    {
        var client = AuthedWith(new FakeModels(Sample(withGpu: false)));

        var status = await client.GetFromJsonAsync<StatusDto>("/api/models");

        Assert.NotNull(status);
        Assert.NotEmpty(status!.Installed);
        Assert.Empty(status.Gpus);
    }

    [Fact]
    public async Task Requires_authentication()
    {
        var response = await _factory.CreateClient().GetAsync("/api/models");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Returns_502_when_ollama_fails()
    {
        var client = AuthedWith(new ThrowingModels());
        var response = await client.GetAsync("/api/models");
        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
    }

    [Fact]
    public async Task Absent_when_disabled()
    {
        Environment.SetEnvironmentVariable("Plugins__Models__Enabled", "false");
        try
        {
            await using var factory = new WebApplicationFactory<Program>();
            var client = factory.AuthedClient();

            var response = await client.GetAsync("/api/models");
            var plugins = await client.GetFromJsonAsync<List<PluginDto>>("/api/plugins");

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
            Assert.DoesNotContain(plugins!, p => p.Id == "models");
        }
        finally
        {
            Environment.SetEnvironmentVariable("Plugins__Models__Enabled", null);
        }
    }

    // ── Compare tests ─────────────────────────────────────────────────────────

    [Fact]
    public async Task Compare_returns_results_for_all_models()
    {
        var inference = new FakeInference((model, _) =>
            Task.FromResult(new CompareResult(model, $"response from {model}", null, 10)));
        var client = AuthedWithInference(inference);

        var response = await client.PostAsJsonAsync("/api/models/compare",
            new { prompt = "hi", models = new[] { "a", "b" } });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var results = await response.Content.ReadFromJsonAsync<List<CompareResultDto>>();
        Assert.NotNull(results);
        Assert.Equal(2, results!.Count);
        Assert.All(results, r => Assert.NotNull(r.Content));
    }

    [Fact]
    public async Task Compare_returns_200_when_one_model_fails()
    {
        var inference = new FakeInference((model, _) =>
        {
            if (model == "bad")
            {
                throw new HttpRequestException("unreachable");
            }

            return Task.FromResult(new CompareResult(model, "ok", null, 5));
        });
        var client = AuthedWithInference(inference);

        var response = await client.PostAsJsonAsync("/api/models/compare",
            new { prompt = "test", models = new[] { "good", "bad" } });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var results = await response.Content.ReadFromJsonAsync<List<CompareResultDto>>();
        Assert.NotNull(results);
        Assert.Equal(2, results!.Count);
        Assert.Contains(results, r => r.Content != null);
        Assert.Contains(results, r => r.Error != null);
    }

    [Fact]
    public async Task Compare_returns_502_when_all_models_fail()
    {
        var inference = new FakeInference((model, _) =>
            Task.FromResult(new CompareResult(model, null, "fail", 0)));
        var client = AuthedWithInference(inference);

        var response = await client.PostAsJsonAsync("/api/models/compare",
            new { prompt = "test", models = new[] { "x", "y" } });

        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
    }

    [Fact]
    public async Task Compare_returns_400_when_too_many_models()
    {
        var inference = new FakeInference((m, _) => Task.FromResult(new CompareResult(m, "ok", null, 0)));
        var client = AuthedWithInference(inference);
        var nineModels = Enumerable.Range(1, 9).Select(i => $"model{i}").ToArray();

        var response = await client.PostAsJsonAsync("/api/models/compare",
            new { prompt = "hi", models = nineModels });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Compare_returns_400_for_empty_prompt()
    {
        var inference = new FakeInference((m, _) => Task.FromResult(new CompareResult(m, "ok", null, 0)));
        var client = AuthedWithInference(inference);

        var response = await client.PostAsJsonAsync("/api/models/compare",
            new { prompt = "", models = new[] { "llama3:latest" } });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ── Library tests ─────────────────────────────────────────────────────────

    [Fact]
    public async Task Library_returns_catalogue_entries()
    {
        var client = AuthedWith(new FakeModels(Sample(withGpu: false)));

        var response = await client.GetAsync("/api/models/library");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var entries = await response.Content.ReadFromJsonAsync<List<CatalogueEntryDto>>();
        Assert.NotNull(entries);
        Assert.NotEmpty(entries!);
    }

    [Fact]
    public async Task Library_entries_have_fits_field()
    {
        var client = AuthedWith(new FakeModels(Sample(withGpu: true)));

        var response = await client.GetAsync("/api/models/library");
        var entries = await response.Content.ReadFromJsonAsync<List<CatalogueEntryDto>>();

        Assert.NotNull(entries);
        Assert.All(entries!, e => Assert.NotNull(e.Fits));
    }

    // ── Pull tests ────────────────────────────────────────────────────────────

    [Fact]
    public async Task Pull_returns_200_for_valid_name()
    {
        var inference = new FakeInference((m, _) => Task.FromResult(new CompareResult(m, "ok", null, 0)));
        var client = AuthedWithInference(inference);

        var response = await client.PostAsJsonAsync("/api/models/pull", new { name = "llama3.2:3b" });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Pull_returns_400_for_empty_name()
    {
        var inference = new FakeInference((m, _) => Task.FromResult(new CompareResult(m, "ok", null, 0)));
        var client = AuthedWithInference(inference);

        var response = await client.PostAsJsonAsync("/api/models/pull", new { name = "" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ── Delete test ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Delete_returns_204()
    {
        // DeleteModelEndpoint uses IHttpClientFactory directly, so we need the real handler
        // but pointed at a fake HTTP server. We use a delegate handler that returns 200 for /api/delete.
        var handler = new DelegatingHandlerStub(req =>
        {
            if (req.Method == System.Net.Http.HttpMethod.Delete &&
                req.RequestUri!.AbsolutePath == "/api/delete")
            {
                return new HttpResponseMessage(HttpStatusCode.OK);
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });

        var client = _factory.Authed(s =>
        {
            // Override the named client that DeleteModelEndpoint creates
            s.AddHttpClient("models-delete")
             .ConfigurePrimaryHttpMessageHandler(() => handler);
            // Also stub the models client so the app starts cleanly
            s.AddSingleton<IModelsClient>(new FakeModels(Sample(withGpu: false)));
        }).CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.Header, "1");

        // URL-encode the colon in the model tag
        var response = await client.DeleteAsync("/api/models/llama3.2%3Alatest");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private HttpClient AuthedWith(IModelsClient models)
    {
        var client = _factory.Authed(s => s.AddSingleton(models)).CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.Header, "1");
        return client;
    }

    private HttpClient AuthedWithInference(IOllamaInferenceClient inference)
    {
        var client = _factory.Authed(s =>
        {
            s.AddSingleton<IModelsClient>(new FakeModels(Sample(withGpu: false)));
            s.AddSingleton(inference);
        }).CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.Header, "1");
        return client;
    }

    // ── DTOs ──────────────────────────────────────────────────────────────────

    private sealed record StatusDto(string Version, List<ModelDto> Installed, List<GpuDto> Gpus);

    private sealed record ModelDto(string Name);

    private sealed record GpuDto(string Name);

    private sealed record PluginDto(string Id);

    private sealed record CompareResultDto(string Model, string? Content, string? Error, long DurationMs);

    private sealed record CatalogueEntryDto(string Name, string Description, string Fits);

    // ── Fakes ─────────────────────────────────────────────────────────────────

    private sealed class FakeModels(ModelsStatus status) : IModelsClient
    {
        public Task<ModelsStatus> GetStatusAsync(CancellationToken ct = default) => Task.FromResult(status);
    }

    private sealed class ThrowingModels : IModelsClient
    {
        public Task<ModelsStatus> GetStatusAsync(CancellationToken ct = default) =>
            throw new HttpRequestException("ollama unreachable");
    }

    private sealed class FakeInference(Func<string, string, Task<CompareResult>> handler) : IOllamaInferenceClient
    {
        public Task<CompareResult> GenerateAsync(string model, string prompt, CancellationToken ct = default) =>
            handler(model, prompt);

        public Task PullAsync(string name, CancellationToken ct = default) => Task.CompletedTask;
    }

    private sealed class DelegatingHandlerStub(Func<HttpRequestMessage, HttpResponseMessage> handler)
        : DelegatingHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken) =>
            Task.FromResult(handler(request));
    }
}
