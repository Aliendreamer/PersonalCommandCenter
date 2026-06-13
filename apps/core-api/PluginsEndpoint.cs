using CoreApi.Plugins;
using FastEndpoints;
using Pcc.Plugins;

namespace CoreApi;

/// <summary><c>GET /api/plugins</c> — the manifests of the currently enabled plugins.</summary>
internal sealed class PluginsEndpoint(PluginRegistry registry)
    : EndpointWithoutRequest<IReadOnlyList<PluginManifest>>
{
    public override void Configure()
    {
        Get("/plugins");
    }

    public override Task HandleAsync(CancellationToken ct) =>
        Send.OkAsync(registry.Manifests, ct);
}
