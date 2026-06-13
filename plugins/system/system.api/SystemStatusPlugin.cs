using FastEndpoints;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Pcc.Plugins.SystemPlugin;

/// <summary>
/// The sample plugin. Exercises every layer of the host: discovery, config-driven
/// activation, manifest, a status endpoint, and (in the UI lib) dashboard surfaces.
/// </summary>
public sealed class SystemStatusPlugin : IPlugin
{
    public string Id => "system";

    public PluginManifest Manifest { get; } =
        new("system", "System", "/system", ["system-status"]);

    public void Configure(IServiceCollection services, IConfiguration config)
    {
        // No services needed yet.
    }
}

/// <summary>Live status reported by the system plugin and rendered on the dashboard tile.</summary>
public sealed record SystemStatus(bool ApiHealthy, string Version, double UptimeSeconds, string Hostname);

/// <summary><c>GET /api/system/status</c> — discovered by the host when the plugin is enabled.</summary>
internal sealed class SystemStatusEndpoint : EndpointWithoutRequest<SystemStatus>
{
    private static readonly DateTimeOffset StartedAt = DateTimeOffset.UtcNow;

    public override void Configure()
    {
        Get("/system/status");
        AllowAnonymous();
    }

    public override Task HandleAsync(CancellationToken ct) =>
        Send.OkAsync(CurrentStatus(), ct);

    private static SystemStatus CurrentStatus() =>
        new(
            ApiHealthy: true,
            Version: typeof(SystemStatusPlugin).Assembly.GetName().Version?.ToString() ?? "0.0.0",
            UptimeSeconds: Math.Round(Math.Max(0, (DateTimeOffset.UtcNow - StartedAt).TotalSeconds), 3),
            Hostname: Environment.MachineName);
}
