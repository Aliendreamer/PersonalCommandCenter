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
            foreach (var type in SafeGetTypes(assembly, logger))
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

    // GetTypes throws ReflectionTypeLoadException if any type fails to load; fall back to the
    // types that did load so one bad assembly can't abort discovery of all plugins.
    private static IEnumerable<Type> SafeGetTypes(Assembly assembly, ILogger logger)
    {
        try
        {
            return assembly.GetTypes();
        }
        catch (ReflectionTypeLoadException ex)
        {
            LogTypeLoadFailed(logger, assembly.FullName ?? assembly.GetName().Name ?? "?", ex);
            return ex.Types.OfType<Type>();
        }
    }

    [LoggerMessage(
        Level = LogLevel.Error,
        Message = "Failed to instantiate plugin type {PluginType}; skipping.")]
    private static partial void LogDiscoveryFailed(ILogger logger, string pluginType, Exception ex);

    [LoggerMessage(
        Level = LogLevel.Error,
        Message = "Some types in assembly {Assembly} failed to load; using the ones that did.")]
    private static partial void LogTypeLoadFailed(ILogger logger, string assembly, Exception ex);
}
