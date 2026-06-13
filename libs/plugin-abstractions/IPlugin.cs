using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Pcc.Plugins;

/// <summary>
/// A compile-time plugin module. The host discovers implementations, activates the ones
/// enabled via <c>Plugins:{Id}:Enabled</c>, and surfaces their manifests at /api/plugins.
/// A plugin's HTTP routes are FastEndpoints endpoint classes in the plugin's assembly,
/// discovered by the host from the enabled plugins' assemblies (no explicit mapping call).
/// </summary>
public interface IPlugin
{
    /// <summary>Stable, lowercase identifier. Matches the config key under "Plugins".</summary>
    string Id { get; }

    /// <summary>What the web shell needs to render this plugin (nav, route, widgets).</summary>
    PluginManifest Manifest { get; }

    /// <summary>Register the plugin's services. <paramref name="config"/> is the plugin's own section.</summary>
    void Configure(IServiceCollection services, IConfiguration config);
}
