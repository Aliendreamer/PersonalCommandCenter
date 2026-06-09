using Pcc.Plugins;

namespace CoreApi.Plugins;

/// <summary>
/// Activates the plugins enabled via configuration (<c>Plugins:{id}:Enabled</c>) and tracks
/// the successfully activated set. Activation failures are logged and skipped so one bad
/// plugin never takes down the host.
/// </summary>
public sealed partial class PluginRegistry
{
    private readonly List<IPlugin> _enabled = [];

    /// <summary>Plugins that activated successfully, in discovery order.</summary>
    public IReadOnlyList<IPlugin> EnabledPlugins => _enabled;

    /// <summary>Manifests of the enabled plugins, for the /api/plugins response.</summary>
    public IReadOnlyList<PluginManifest> Manifests => _enabled.Select(p => p.Manifest).ToList();

    /// <summary>
    /// Inspects each available plugin, activates the enabled ones by calling
    /// <see cref="IPlugin.Configure"/> with the plugin's own config section, and records
    /// the ones that activate without throwing.
    /// </summary>
    public void ActivateEnabled(
        IEnumerable<IPlugin> available,
        IServiceCollection services,
        IConfiguration config,
        ILogger logger)
    {
        foreach (var plugin in available)
        {
            if (!config.GetValue<bool>($"Plugins:{plugin.Id}:Enabled"))
            {
                continue;
            }

            try
            {
                plugin.Configure(services, config.GetSection($"Plugins:{plugin.Id}"));
                _enabled.Add(plugin);
            }
            catch (Exception ex)
            {
                LogActivationFailed(logger, plugin.Id, ex);
            }
        }
    }

    [LoggerMessage(Level = LogLevel.Error, Message = "Plugin {PluginId} failed to activate; skipping.")]
    private static partial void LogActivationFailed(ILogger logger, string pluginId, Exception ex);
}
