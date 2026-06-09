using System.Reflection;
using Pcc.Plugins;

namespace CoreApi.Plugins;

/// <summary>
/// Finds <see cref="IPlugin"/> implementations in the given (compile-time referenced)
/// assemblies and instantiates them. Instantiation failures are logged and skipped.
/// </summary>
public static partial class PluginDiscovery
{
    public static IReadOnlyList<IPlugin> Discover(IEnumerable<Assembly> assemblies, ILogger logger)
    {
        var plugins = new List<IPlugin>();

        foreach (var assembly in assemblies)
        {
            foreach (var type in assembly.GetTypes())
            {
                if (!typeof(IPlugin).IsAssignableFrom(type) || type.IsAbstract || type.IsInterface)
                {
                    continue;
                }

                try
                {
                    if (Activator.CreateInstance(type) is IPlugin plugin)
                    {
                        plugins.Add(plugin);
                    }
                }
                catch (Exception ex)
                {
                    LogDiscoveryFailed(logger, type.FullName ?? type.Name, ex);
                }
            }
        }

        return plugins;
    }

    [LoggerMessage(
        Level = LogLevel.Error,
        Message = "Failed to instantiate plugin type {PluginType}; skipping.")]
    private static partial void LogDiscoveryFailed(ILogger logger, string pluginType, Exception ex);
}
