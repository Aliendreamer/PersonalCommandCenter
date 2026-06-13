using System.Reflection;
using CoreApi.Plugins;
using FastEndpoints;
using Pcc.Plugins.Iot;
using Pcc.Plugins.SystemPlugin;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// OpenAPI document, surfaced through the Scalar API reference UI at /scalar.
builder.Services.AddOpenApi();

// The web shell calls the API from a different origin (local network). Allow only the
// configured shell origin(s) — comma-separated in `Web:Origins` — rather than any origin.
var corsOrigins = (builder.Configuration["Web:Origins"] ?? "http://localhost:3000")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(corsOrigins).AllowAnyHeader().AllowAnyMethod()));

// Discover and activate plugins before the container is built so each enabled plugin can
// register its services. Compile-time referenced plugin assemblies are listed here.
Assembly[] pluginAssemblies = [typeof(SystemStatusPlugin).Assembly, typeof(IotPlugin).Assembly];

using var bootstrapLoggerFactory = LoggerFactory.Create(logging => logging.AddConsole());
var bootstrapLogger = bootstrapLoggerFactory.CreateLogger("Plugins");

var available = PluginDiscovery.Discover(pluginAssemblies, bootstrapLogger);
var registry = new PluginRegistry();
registry.ActivateEnabled(available, builder.Services, builder.Configuration, bootstrapLogger);
builder.Services.AddSingleton(registry);

// FastEndpoints discovers endpoint classes from the host assembly and every referenced plugin
// assembly. We gate registration to the host plus the ENABLED plugins (see the filter below),
// so a disabled plugin's endpoints are never mapped.
builder.Services.AddFastEndpoints(o => o.Assemblies = pluginAssemblies);

var app = builder.Build();

app.UseCors();

app.MapOpenApi();
app.MapScalarApiReference();

// All FastEndpoints routes are prefixed with `api` (e.g. /api/plugins, /api/system/status).
// Only host endpoints and endpoints from enabled plugins' assemblies are registered.
var hostAssembly = typeof(Program).Assembly;
var enabledAssemblies = registry.EnabledPlugins.Select(p => p.GetType().Assembly).ToHashSet();
app.UseFastEndpoints(c =>
{
    c.Endpoints.RoutePrefix = "api";
    c.Endpoints.Filter = ep =>
        ep.EndpointType.Assembly == hostAssembly || enabledAssemblies.Contains(ep.EndpointType.Assembly);
});

app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));

app.Run();

// Exposed so WebApplicationFactory<Program> can boot the host in integration tests.
public partial class Program;
