using System.Net;
using System.Net.Http.Json;
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

    private HttpClient AuthedWith(IModelsClient models)
    {
        var client = _factory.Authed(s => s.AddSingleton(models)).CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.Header, "1");
        return client;
    }

    private sealed record StatusDto(string Version, List<ModelDto> Installed, List<GpuDto> Gpus);

    private sealed record ModelDto(string Name);

    private sealed record GpuDto(string Name);

    private sealed record PluginDto(string Id);

    private sealed class FakeModels(ModelsStatus status) : IModelsClient
    {
        public Task<ModelsStatus> GetStatusAsync(CancellationToken ct = default) => Task.FromResult(status);
    }

    private sealed class ThrowingModels : IModelsClient
    {
        public Task<ModelsStatus> GetStatusAsync(CancellationToken ct = default) =>
            throw new HttpRequestException("ollama unreachable");
    }
}
