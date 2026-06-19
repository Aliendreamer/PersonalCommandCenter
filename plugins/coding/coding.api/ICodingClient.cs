namespace Pcc.Plugins.Coding;

/// <summary>Reads the coding-activity summary from Wakapi for a range. Abstracted so endpoints/tests can fake it.</summary>
public interface ICodingClient
{
    Task<CodingStatus> GetStatusAsync(string range, CancellationToken cancellationToken = default);
}
