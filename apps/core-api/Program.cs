using System.Reflection;
using CoreApi.Plugins;
using Pcc.Plugins.SystemPlugin;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// OpenAPI document, surfaced through the Scalar API reference UI at /scalar.
builder.Services.AddOpenApi();

// Discover and activate plugins before the container is built so each enabled plugin can
// register its services. Compile-time referenced plugin assemblies are listed here.
Assembly[] pluginAssemblies = [typeof(SystemStatusPlugin).Assembly];

using var bootstrapLoggerFactory = LoggerFactory.Create(logging => logging.AddConsole());
var bootstrapLogger = bootstrapLoggerFactory.CreateLogger("Plugins");

var available = PluginDiscovery.Discover(pluginAssemblies, bootstrapLogger);
var registry = new PluginRegistry();
registry.ActivateEnabled(available, builder.Services, builder.Configuration, bootstrapLogger);
builder.Services.AddSingleton(registry);

var app = builder.Build();

app.MapOpenApi();
app.MapScalarApiReference();

app.MapGet("/", () => "Hello World!");
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));
app.MapGet("/api/plugins", (PluginRegistry plugins) => Results.Ok(plugins.Manifests));

// Let each enabled plugin map its own endpoints onto the host.
foreach (var plugin in registry.EnabledPlugins)
{
    plugin.MapEndpoints(app);
}

app.Run();
