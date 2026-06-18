namespace Pcc.Plugins.Coding;

/// <summary>Bound from the plugin's config section (<c>Plugins:Coding</c>).</summary>
public sealed class CodingOptions
{
    /// <summary>The internal Wakapi base URL (compose network), e.g. <c>http://wakapi:3000</c>.</summary>
    public string BaseUrl { get; set; } = "http://wakapi:3000";

    /// <summary>The Wakapi API key (HTTP Basic). Empty = unconfigured → 502. Lives in <c>.env</c>.</summary>
    public string ApiKey { get; set; } = "";
}
