using System.Net;
using Microsoft.Extensions.Options;
using Pcc.Plugins.Models;

namespace CoreApi.Tests;

public class ModelsClientTests
{
    private const string Version = """{"version":"0.30.9"}""";

    private const string Tags = """
        {"models":[
          {"name":"llama3:latest","size":4661211808,
           "details":{"family":"llama","parameter_size":"8B","quantization_level":"Q4_0"}}
        ]}
        """;

    private const string Ps = """{"models":[{"name":"llama3:latest","size_vram":5137025024}]}""";

    private const string Gpu = """
        # HELP nvidia_smi_gpu_info GPU info
        nvidia_smi_gpu_info{uuid="GPU-a",name="NVIDIA GeForce RTX 5070 Laptop GPU"} 1
        nvidia_smi_utilization_gpu_ratio{uuid="GPU-a"} 0.15
        nvidia_smi_temperature_gpu{uuid="GPU-a"} 52
        nvidia_smi_memory_used_bytes{uuid="GPU-a"} 2147483648
        nvidia_smi_memory_total_bytes{uuid="GPU-a"} 8589934592
        """;

    [Fact]
    public async Task Maps_installed_running_version_and_gpu()
    {
        var client = Create(ok: true);

        var status = await client.GetStatusAsync();

        Assert.Equal("0.30.9", status.Version);
        var model = Assert.Single(status.Installed);
        Assert.Equal("llama3:latest", model.Name);
        Assert.Equal(4661211808, model.SizeBytes);
        Assert.Equal("8B", model.ParameterSize);
        var run = Assert.Single(status.Running);
        Assert.Equal(5137025024, run.SizeVramBytes);
        var gpu = Assert.Single(status.Gpus);
        Assert.Equal("NVIDIA GeForce RTX 5070 Laptop GPU", gpu.Name);
        Assert.Equal(15, gpu.UtilizationPct);
        Assert.Equal(52, gpu.TemperatureC);
        Assert.Equal(2048, gpu.MemoryUsedMb);
        Assert.Equal(8192, gpu.MemoryTotalMb);
    }

    [Fact]
    public async Task Gpu_exporter_down_keeps_models_with_empty_gpus()
    {
        var client = Create(ok: true, gpuThrows: true);

        var status = await client.GetStatusAsync();

        Assert.NotEmpty(status.Installed);
        Assert.Empty(status.Gpus);
    }

    [Fact]
    public async Task Throws_when_ollama_unreachable()
    {
        var client = Create(ok: false);

        await Assert.ThrowsAnyAsync<Exception>(() => client.GetStatusAsync());
    }

    [Fact]
    public void ParseGpus_returns_empty_without_gpu_info()
    {
        Assert.Empty(ModelsClient.ParseGpus("some other text\n"));
    }

    private static ModelsClient Create(bool ok, bool gpuThrows = false)
    {
        var handler = new StubHandler(ok, gpuThrows);
        var options = Options.Create(new ModelsOptions
        {
            Ollama = new OllamaOptions { BaseUrl = "http://ollama.test:11434" },
            Gpu = new GpuOptions { ExporterUrl = "http://gpu.test:9835/metrics" },
        });
        return new ModelsClient(new HttpClient(handler), options);
    }

    private sealed class StubHandler(bool ok, bool gpuThrows) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            var path = request.RequestUri!.AbsoluteUri;

            if (path.Contains("gpu.test", StringComparison.Ordinal))
            {
                return gpuThrows
                    ? throw new HttpRequestException("gpu down")
                    : Task.FromResult(Text(Gpu));
            }

            if (!ok)
            {
                throw new HttpRequestException("ollama down");
            }

            var body = path.EndsWith("/api/version", StringComparison.Ordinal) ? Version
                : path.EndsWith("/api/tags", StringComparison.Ordinal) ? Tags
                : Ps;
            return Task.FromResult(Text(body));
        }

        private static HttpResponseMessage Text(string content) =>
            new(HttpStatusCode.OK) { Content = new StringContent(content) };
    }
}
