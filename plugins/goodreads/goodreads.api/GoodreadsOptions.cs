namespace Pcc.Plugins.Goodreads;

/// <summary>Bound from the plugin's config section (<c>Plugins:Goodreads</c>).</summary>
public sealed class GoodreadsOptions
{
    public string BaseUrl { get; set; } = "https://www.goodreads.com";

    public string UserId { get; set; } = "";

    public string Shelf { get; set; } = "currently-reading";
}
