namespace Pcc.Plugins.Models;

/// <summary>Bound from the plugin's config section (<c>Plugins:Models</c>).</summary>
public sealed class ModelsOptions
{
    public OllamaOptions Ollama { get; set; } = new();

    public GpuOptions Gpu { get; set; } = new();
}

public sealed class OllamaOptions
{
    public string BaseUrl { get; set; } = "http://ollama:11434";
}

public sealed class GpuOptions
{
    /// <summary>The nvidia exporter's Prometheus endpoint (e.g. <c>http://gpu-exporter:9835/metrics</c>); empty = no GPU panel.</summary>
    public string ExporterUrl { get; set; } = "";
}
