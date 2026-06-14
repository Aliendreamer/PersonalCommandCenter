namespace Pcc.Plugins.Uptime;

/// <summary>Pings the configured targets. Abstracted so endpoints/tests can fake it.</summary>
public interface IUptimeClient
{
    Task<IReadOnlyList<UptimeCheck>> CheckAllAsync(CancellationToken cancellationToken = default);
}
