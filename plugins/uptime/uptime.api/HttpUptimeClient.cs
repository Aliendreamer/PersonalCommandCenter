using System.Diagnostics;
using System.Net.Sockets;
using Microsoft.Extensions.Options;

namespace Pcc.Plugins.Uptime;

/// <summary>
/// Pings each configured target concurrently (timeout-bounded) and reports up/down + latency.
/// HTTP(S) targets are GET-pinged (up = status &lt; 400); <c>tcp://host:port</c> targets are probed by
/// opening a socket (up = connect succeeds) so HTTP-less services like Postgres/Redis can be monitored.
/// </summary>
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

        var uri = new Uri(target.Url);
        return uri.Scheme == "tcp"
            ? await TcpPingAsync(target, uri, timeout.Token)
            : await HttpPingAsync(target, uri, timeout.Token);
    }

    private async Task<UptimeCheck> HttpPingAsync(UptimeTarget target, Uri uri, CancellationToken cancellationToken)
    {
        var stopwatch = Stopwatch.StartNew();
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, uri);
            using var response = await http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
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

    // TCP-only services (Postgres, Redis, raw proxies) have no HTTP status — "up" just means the
    // socket connects within the timeout, so StatusCode is always null for these.
    private async Task<UptimeCheck> TcpPingAsync(UptimeTarget target, Uri uri, CancellationToken cancellationToken)
    {
        var stopwatch = Stopwatch.StartNew();
        try
        {
            using var tcp = new TcpClient();
            await tcp.ConnectAsync(uri.Host, uri.Port, cancellationToken);
            stopwatch.Stop();
            return new UptimeCheck(target.Name, target.Url, true, null, stopwatch.ElapsedMilliseconds);
        }
        catch (Exception)
        {
            stopwatch.Stop();
            return new UptimeCheck(target.Name, target.Url, false, null, stopwatch.ElapsedMilliseconds);
        }
    }
}
