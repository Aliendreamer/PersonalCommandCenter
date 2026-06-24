namespace Pcc.Plugins.Rss;

/// <summary>Bound from the plugin's config section (<c>Plugins:Rss</c>).</summary>
public sealed class RssOptions
{
    public FeedConfig[] Feeds { get; set; } = [];

    /// <summary>Newest items kept per topic (cards use the top 10; the rest feed the list).</summary>
    public int MaxItemsPerTopic { get; set; } = 25;
}
