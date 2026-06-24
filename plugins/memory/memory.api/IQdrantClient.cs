namespace Pcc.Plugins.Memory;

/// <summary>Wraps the Qdrant REST API for vector storage and retrieval. Abstracted for testability.</summary>
public interface IQdrantClient
{
    Task EnsureCollectionAsync(string name, int vectorSize, CancellationToken ct = default);
    Task UpsertAsync(string collection, Guid id, float[] vector, MemoryItem item, CancellationToken ct = default);
    Task<IReadOnlyList<MemoryEntry>> SearchAsync(string collection, float[] vector, int limit, CancellationToken ct = default);
    Task<IReadOnlyList<MemoryEntry>> ScrollAsync(string collection, int limit, CancellationToken ct = default);
    Task DeleteAsync(string collection, Guid id, CancellationToken ct = default);
}
