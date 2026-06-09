using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Pcc.Plugins;

namespace Pcc.Plugins.SystemPlugin;

/// <summary>
/// The sample plugin. Exercises every layer of the host: discovery, config-driven
/// activation, manifest, and (in task 4) a status endpoint plus UI surfaces.
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

    public void MapEndpoints(IEndpointRouteBuilder endpoints)
    {
        // Status endpoint added via TDD in task 4.
    }
}
