namespace Pcc.Plugins.Memory;

/// <summary>Generates text embeddings via Ollama. Abstracted for testability.</summary>
public interface IOllamaEmbeddingClient
{
    Task<float[]> EmbedAsync(string model, string text, CancellationToken ct = default);
}
