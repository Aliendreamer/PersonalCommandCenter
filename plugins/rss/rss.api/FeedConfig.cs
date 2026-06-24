namespace Pcc.Plugins.Rss;

/// <summary>One configured feed and the topic its items belong to.</summary>
public sealed class FeedConfig
{
    public string Url { get; set; } = "";

    /// <summary>One of: technology, bulgaria, world, sports.</summary>
    public string Topic { get; set; } = "";
}
