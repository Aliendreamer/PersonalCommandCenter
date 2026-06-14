namespace Pcc.Plugins.Goodreads;

/// <summary>A book on a Goodreads shelf, slimmed to what the command center renders.</summary>
public sealed record Book(string Title, string? Author, string Link, string? CoverUrl);
