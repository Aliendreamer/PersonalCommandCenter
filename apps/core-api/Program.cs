using System.Reflection;
using System.Security.Claims;
using System.Text.Json.Serialization;
using CoreApi.Auth;
using CoreApi.Data;
using CoreApi.Notifications;
using CoreApi.Plugins;
using FastEndpoints;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Pcc.Plugins;
using Pcc.Plugins.Calendar;
using Pcc.Plugins.Goodreads;
using Pcc.Plugins.Iot;
using Pcc.Plugins.Notifications;
using Pcc.Plugins.Rss;
using Pcc.Plugins.Search;
using Pcc.Plugins.SystemPlugin;
using Pcc.Plugins.Tasks;
using Pcc.Plugins.Weather;
using Scalar.AspNetCore;
using ZiggyCreatures.Caching.Fusion;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

// CORS — only the configured web shell origin(s), with credentials (the session cookie rides along).
var corsOrigins = (builder.Configuration["Web:Origins"] ?? "http://localhost:3000")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(corsOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

// --- Auth: options, data, session store, Keycloak client, current user, cleanup ---
builder.Services.Configure<AuthOptions>(builder.Configuration.GetSection("Auth"));

var connectionString = builder.Configuration.GetConnectionString("Postgres")
    ?? "Host=postgres;Database=pcc;Username=pcc;Password=pcc-dev";
builder.Services.AddDbContext<PccDbContext>(o => o.UseNpgsql(connectionString));
builder.Services.AddFusionCache();
builder.Services.AddHttpClient<IKeycloakClient, KeycloakClient>();
builder.Services.AddScoped<ISessionService, SessionService>();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();
builder.Services.AddHostedService<SessionCleanupHostedService>();

// Notification alert-bus — host infrastructure, registered regardless of the plugin's enabled flag
// so any code can publish even when the notifications UI is off.
builder.Services.Configure<NtfyOptions>(builder.Configuration.GetSection("Notifications:Ntfy"));
builder.Services.AddHttpClient<INtfyClient, NtfyClient>();
builder.Services.AddScoped<NotificationService>();
builder.Services.AddScoped<INotificationPublisher>(sp => sp.GetRequiredService<NotificationService>());
builder.Services.AddScoped<INotificationStore>(sp => sp.GetRequiredService<NotificationService>());

// Persist DataProtection keys to a mounted volume so they survive container restarts
// (Development/tests use the default ephemeral keystore).
if (!builder.Environment.IsDevelopment())
{
    builder.Services.AddDataProtection()
        .PersistKeysToFileSystem(new DirectoryInfo("/keys"))
        .SetApplicationName("pcc-core-api");
}

// JwtBearer validates the Keycloak access token; the token is sourced from the mp_sid cookie.
var keycloak = builder.Configuration.GetSection("Auth:Keycloak").Get<KeycloakSettings>() ?? new KeycloakSettings();
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = string.IsNullOrEmpty(keycloak.Authority) ? null : keycloak.Authority;
        // The local *.pcc.localhost harness is HTTP; require HTTPS metadata only for an https Authority.
        options.RequireHttpsMetadata = keycloak.Authority.StartsWith("https://", StringComparison.OrdinalIgnoreCase);
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateAudience = false,
            NameClaimType = "sub",
            RoleClaimType = ClaimTypes.Role,
        };
        options.Events = new JwtBearerEvents { OnMessageReceived = CookieJwtBearerEvents.OnMessageReceivedAsync };
    });
builder.Services.AddAuthorization();

// --- Plugins: discover, activate enabled, expose manifests + FastEndpoints ---
Assembly[] pluginAssemblies =
[
    typeof(SystemStatusPlugin).Assembly,
    typeof(IotPlugin).Assembly,
    typeof(CalendarPlugin).Assembly,
    typeof(TasksPlugin).Assembly,
    typeof(NotificationsPlugin).Assembly,
    typeof(SearchPlugin).Assembly,
    typeof(WeatherPlugin).Assembly,
    typeof(RssPlugin).Assembly,
    typeof(GoodreadsPlugin).Assembly,
];

using var bootstrapLoggerFactory = LoggerFactory.Create(logging => logging.AddConsole());
var bootstrapLogger = bootstrapLoggerFactory.CreateLogger("Plugins");

var available = PluginDiscovery.Discover(pluginAssemblies, bootstrapLogger);
var registry = new PluginRegistry();
registry.ActivateEnabled(available, builder.Services, builder.Configuration, bootstrapLogger);
builder.Services.AddSingleton(registry);

builder.Services.AddFastEndpoints(o => o.Assemblies = pluginAssemblies);

var app = builder.Build();

// Apply EF migrations outside Development (the live container); Development/tests skip the DB.
if (!app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    await scope.ServiceProvider.GetRequiredService<PccDbContext>().Database.MigrateAsync();
    // Seed one startup notification (exercises the bus + ntfy once per boot).
    await scope.ServiceProvider.GetRequiredService<INotificationPublisher>()
        .PublishAsync("system", NotificationSeverity.Info, "Command center online");
}

app.UseCors();

app.MapOpenApi();
app.MapScalarApiReference();

app.UseAuthentication();
app.UseAuthorization();

// FastEndpoints routes are prefixed `api`. Only host + enabled-plugin endpoints register; every
// request runs the CurrentUser pre-processor (a no-op for anonymous requests).
var hostAssembly = typeof(Program).Assembly;
var enabledAssemblies = registry.EnabledPlugins.Select(p => p.GetType().Assembly).ToHashSet();
app.UseFastEndpoints(c =>
{
    c.Endpoints.RoutePrefix = "api";
    c.Endpoints.Filter = ep =>
        ep.EndpointType.Assembly == hostAssembly || enabledAssemblies.Contains(ep.EndpointType.Assembly);
    c.Endpoints.Configurator = ep => ep.PreProcessor<CurrentUserPreProcessor>(Order.Before);
    // Serialize enums as strings (e.g. NotificationSeverity → "Info") to match the TS contracts.
    c.Serializer.Options.Converters.Add(new JsonStringEnumConverter());
});

app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));

app.Run();

// Exposed so WebApplicationFactory<Program> can boot the host in integration tests.
public partial class Program;
