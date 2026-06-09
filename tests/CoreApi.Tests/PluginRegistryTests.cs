using CoreApi.Plugins;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Pcc.Plugins;

namespace CoreApi.Tests;

public class PluginRegistryTests
{
    [Fact]
    public void Activates_only_enabled_plugins_and_skips_failures()
    {
        var ok = new FakePlugin("ok");
        var disabled = new FakePlugin("disabled");
        var bad = new FakePlugin("bad", throwOnConfigure: true);
        var registry = new PluginRegistry();

        registry.ActivateEnabled(
            [ok, disabled, bad],
            new ServiceCollection(),
            Config(("ok", true), ("disabled", false), ("bad", true)),
            NullLogger.Instance);

        Assert.Equal(["ok"], registry.EnabledPlugins.Select(p => p.Id));
        Assert.Equal(["ok"], registry.Manifests.Select(m => m.Id));
        Assert.True(ok.Configured);
        Assert.False(disabled.Configured);
    }

    private static IConfiguration Config(params (string Id, bool Enabled)[] entries)
    {
        var dict = entries.ToDictionary(
            e => $"Plugins:{e.Id}:Enabled",
            e => (string?)(e.Enabled ? "true" : "false"));
        return new ConfigurationBuilder().AddInMemoryCollection(dict).Build();
    }

    private sealed class FakePlugin(string id, bool throwOnConfigure = false) : IPlugin
    {
        public string Id => id;
        public bool Configured { get; private set; }
        public PluginManifest Manifest => new(id, id, $"/{id}", []);

        public void Configure(IServiceCollection services, IConfiguration config)
        {
            if (throwOnConfigure)
            {
                throw new InvalidOperationException("boom");
            }

            Configured = true;
        }

        public void MapEndpoints(IEndpointRouteBuilder endpoints) { }
    }
}
