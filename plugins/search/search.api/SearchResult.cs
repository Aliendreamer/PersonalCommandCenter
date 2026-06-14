namespace Pcc.Plugins.Search;

/// <summary>A single metasearch result, slimmed to what the command center renders.</summary>
public sealed record SearchResult(string Title, string Url, string? Content, string? Engine);
