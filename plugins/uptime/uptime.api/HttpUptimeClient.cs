using System.Diagnostics;
using Microsoft.Extensions.Options;

namespace Pcc.Plugins.Uptime;

/// <summary>HTTP-pings each configured target concurrently (timeout-bounded) and reports up/down + latency.</summary>
public sealed class HttpUptimeClient(HttpClient http, IOptions<UptimeOptions> options) : IUptimeClient
{
    private readonly UptimeOptions _options = options.Value;

    public async Task<IReadOnlyList<UptimeCheck>> CheckAllAsync(CancellationToken cancellationToken = default)
    {
        if (_options.Targets.Length == 0)
        {
            throw new InvalidOperationException("Uptime:Targets is not configured.");
        }

        return await Task.WhenAll(_options.Targets.Select(target => PingAsync(target, cancellationToken)));
    }

    private async Task<UptimeCheck> PingAsync(UptimeTarget target, CancellationToken cancellationToken)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(_options.TimeoutSeconds));

        var stopwatch = Stopwatch.StartNew();
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, new Uri(target.Url));
            using var response = await http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, timeout.Token);
            stopwatch.Stop();
            var status = (int)response.StatusCode;
            return new UptimeCheck(target.Name, target.Url, status < 400, status, stopwatch.ElapsedMilliseconds);
        }
        catch (Exception)
        {
            // A timeout or connection failure is a "down" data point, not an endpoint error.
            stopwatch.Stop();
            return new UptimeCheck(target.Name, target.Url, false, null, stopwatch.ElapsedMilliseconds);
        }
    }
}
