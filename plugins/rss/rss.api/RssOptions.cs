namespace Pcc.Plugins.Rss;

/// <summary>Bound from the plugin's config section (<c>Plugins:Rss</c>).</summary>
public sealed class RssOptions
{
    public string[] Feeds { get; set; } = [];

    public int MaxItems { get; set; } = 30;
}
