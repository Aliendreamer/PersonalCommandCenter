using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Pcc.Plugins;

namespace Pcc.Plugins.SystemPlugin;

/// <summary>
/// The sample plugin. Exercises every layer of the host: discovery, config-driven
/// activation, manifest, a status endpoint, and (in the UI lib) dashboard surfaces.
/// </summary>
public sealed class SystemStatusPlugin : IPlugin
{
    private static readonly DateTimeOffset StartedAt = DateTimeOffset.UtcNow;

    public string Id => "system";

    public PluginManifest Manifest { get; } =
        new("system", "System", "/system", ["system-status"]);

    public void Configure(IServiceCollection services, IConfiguration config)
    {
        // No services needed yet.
    }

    public void MapEndpoints(IEndpointRouteBuilder endpoints) =>
        endpoints.MapGet("/api/system/status", () => Results.Ok(CurrentStatus()));

    private static SystemStatus CurrentStatus() =>
        new(
            ApiHealthy: true,
            Version: typeof(SystemStatusPlugin).Assembly.GetName().Version?.ToString() ?? "0.0.0",
            UptimeSeconds: Math.Round(Math.Max(0, (DateTimeOffset.UtcNow - StartedAt).TotalSeconds), 3),
            Hostname: Environment.MachineName);
}

/// <summary>Live status reported by the system plugin and rendered on the dashboard tile.</summary>
public sealed record SystemStatus(bool ApiHealthy, string Version, double UptimeSeconds, string Hostname);
