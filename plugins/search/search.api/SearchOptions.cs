namespace Pcc.Plugins.Search;

/// <summary>Bound from the plugin's config section (<c>Plugins:Search</c>).</summary>
public sealed class SearchOptions
{
    /// <summary>SearXNG base URL (e.g. <c>http://searxng:8080</c>). Empty disables search.</summary>
    public string BaseUrl { get; set; } = "";

    /// <summary>Maximum number of results to return.</summary>
    public int MaxResults { get; set; } = 20;
}
