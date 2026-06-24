namespace Pcc.Plugins.Memory;

/// <summary>A stored memory item (persisted in Qdrant).</summary>
public sealed record MemoryItem(Guid Id, string Content, string[] Tags, DateTimeOffset CreatedAt);

/// <summary>A recalled memory entry, including similarity score.</summary>
public sealed record MemoryEntry(Guid Id, string Content, string[] Tags, DateTimeOffset CreatedAt, double Score);
