namespace Pcc.Plugins.Memory;

/// <summary>Bound from the plugin's config section (<c>Plugins:Memory</c>).</summary>
public sealed class MemoryOptions
{
    public string QdrantBaseUrl { get; set; } = "http://qdrant:6333";
    public string OllamaBaseUrl { get; set; } = "http://ollama:11434";
    public string EmbeddingModel { get; set; } = "nomic-embed-text";
    public int VectorSize { get; set; } = 768;
    public int DefaultRecallLimit { get; set; } = 10;
}
