namespace Pcc.Plugins.Rss;

/// <summary>Bound from the plugin's config section (<c>Plugins:Rss</c>).</summary>
public sealed class RssOptions
{
    public FeedConfig[] Feeds { get; set; } = [];

    /// <summary>Newest items kept per feed URL (applied before merging across topics).</summary>
    public int MaxItemsPerFeed { get; set; } = 10;

    /// <summary>Items older than this many days are discarded.</summary>
    public int MaxAgeDays { get; set; } = 3;

    /// <summary>How often the background service re-pulls all feeds into the cache.</summary>
    public int RefreshIntervalMinutes { get; set; } = 60;
}
