namespace Pcc.Plugins.Rss;

/// <summary>One feed item, slimmed to what the command center renders.</summary>
public sealed record RssItem(string Title, string Link, DateTimeOffset Published, string Source);
