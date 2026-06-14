namespace Pcc.Plugins.Rss;

/// <summary>Fetches and aggregates the configured feeds. Abstracted so endpoints/tests can fake it.</summary>
public interface IFeedClient
{
    Task<IReadOnlyList<RssItem>> GetItemsAsync(CancellationToken cancellationToken = default);
}
