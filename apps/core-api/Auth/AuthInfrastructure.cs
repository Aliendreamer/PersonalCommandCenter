using FastEndpoints;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;

namespace CoreApi.Auth;

/// <summary>
/// Resolves the JwtBearer token from the <c>mp_sid</c> session cookie (when no Authorization
/// header is present), refreshing transparently via <see cref="ISessionService"/>.
/// </summary>
public static class CookieJwtBearerEvents
{
    public static async Task OnMessageReceivedAsync(MessageReceivedContext context)
    {
        if (!string.IsNullOrEmpty(context.Request.Headers.Authorization))
        {
            return;
        }

        var cookies = context.HttpContext.RequestServices.GetRequiredService<IOptions<AuthOptions>>().Value.Cookies;
        var sid = context.Request.Cookies[cookies.SessionName];
        if (string.IsNullOrEmpty(sid))
        {
            return;
        }

        var sessions = context.HttpContext.RequestServices.GetRequiredService<ISessionService>();
        var token = await sessions.ResolveAccessTokenAsync(sid, context.HttpContext.RequestAborted);
        if (!string.IsNullOrEmpty(token))
        {
            context.Token = token;
        }
    }
}

/// <summary>Global pre-processor: hydrates <see cref="ICurrentUser"/> for authenticated requests.</summary>
public sealed class CurrentUserPreProcessor : IGlobalPreProcessor
{
    public async Task PreProcessAsync(IPreProcessorContext context, CancellationToken ct)
    {
        var http = context.HttpContext;
        if (http.User.Identity?.IsAuthenticated == true)
        {
            await http.RequestServices.GetRequiredService<ICurrentUser>().InitializeAsync(http.User, ct);
        }
    }
}

/// <summary>Periodically purges revoked/expired sessions.</summary>
public sealed class SessionCleanupHostedService(IServiceProvider services, IOptions<AuthOptions> options)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(options.Value.Store.CleanupInterval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            using var scope = services.CreateScope();
            await scope.ServiceProvider.GetRequiredService<ISessionService>().PurgeAsync(stoppingToken);
        }
    }
}
