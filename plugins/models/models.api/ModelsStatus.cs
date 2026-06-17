namespace Pcc.Plugins.Models;

/// <summary>An installed Ollama model (from <c>/api/tags</c>).</summary>
public sealed record InstalledModel(
    string Name,
    long SizeBytes,
    string? Family,
    string? ParameterSize,
    string? Quantization);

/// <summary>A currently-loaded Ollama model (from <c>/api/ps</c>).</summary>
public sealed record RunningModel(string Name, long SizeVramBytes);

/// <summary>Per-GPU telemetry from the nvidia exporter.</summary>
public sealed record GpuStat(
    string Name,
    double UtilizationPct,
    double TemperatureC,
    double MemoryUsedMb,
    double MemoryTotalMb);

/// <summary>The model + GPU board surfaced by <c>GET /api/models</c>.</summary>
public sealed record ModelsStatus(
    string Version,
    IReadOnlyList<InstalledModel> Installed,
    IReadOnlyList<RunningModel> Running,
    IReadOnlyList<GpuStat> Gpus);
