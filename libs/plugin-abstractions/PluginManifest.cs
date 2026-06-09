namespace Pcc.Plugins;

/// <summary>
/// The contract the web shell consumes to render an enabled plugin: a nav entry,
/// a route base for its lazy-loaded UI, and the dashboard widget ids it contributes.
/// </summary>
public sealed record PluginManifest(
    string Id,
    string NavLabel,
    string RouteBase,
    IReadOnlyList<string> Widgets);
