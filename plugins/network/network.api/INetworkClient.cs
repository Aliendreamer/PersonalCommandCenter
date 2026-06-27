namespace Pcc.Plugins.Network;

public interface INetworkClient
{
    Task<NetworkStatus> GetStatusAsync(CancellationToken ct = default);
}
