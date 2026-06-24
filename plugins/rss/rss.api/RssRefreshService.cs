using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Pcc.Plugins.Rss;

/// <summary>Proactively pulls all feeds into the cache on startup and every RefreshIntervalMinutes.</summary>
public sealed class RssRefreshService(
    IServiceScopeFactory scopes,
    IOptions<RssOptions> options,
    ILogger<RssRefreshService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var minutes = Math.Max(1, options.Value.RefreshIntervalMinutes);
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(minutes));
        do
        {
            try
            {
                using var scope = scopes.CreateScope();
                await scope.ServiceProvider.GetRequiredService<RssFeedCache>().RefreshAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning(ex, "RSS background refresh failed; keeping last cached items.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
