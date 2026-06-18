namespace Pcc.Plugins.Coding;

/// <summary>Reads the weekly coding-activity summary from Wakapi. Abstracted so endpoints/tests can fake it.</summary>
public interface ICodingClient
{
    Task<CodingStatus> GetStatusAsync(CancellationToken cancellationToken = default);
}
