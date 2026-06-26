using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Pcc.Plugins.Uptime;

/// <summary>
/// Seeds the uptime tracker at startup so UpSince reflects when the app first saw each target as up,
/// not when the first user visits the uptime page (which would always show "0m").
/// </summary>
internal sealed class UptimeStartupService(IServiceProvider services, ILogger<UptimeStartupService> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Brief delay so the HTTP server is fully ready before pinging targets.
        await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);

        try
        {
            using var scope = services.CreateScope();
            var client = scope.ServiceProvider.GetRequiredService<IUptimeClient>();
            await client.CheckAllAsync(stoppingToken);
            logger.LogInformation("Uptime tracker seeded.");
        }
        catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
        {
            logger.LogWarning(ex, "Uptime tracker seed failed — tracker will start on first user visit.");
        }
    }
}
