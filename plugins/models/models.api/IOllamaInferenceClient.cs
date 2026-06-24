namespace Pcc.Plugins.Models;

public interface IOllamaInferenceClient
{
    Task<CompareResult> GenerateAsync(string model, string prompt, CancellationToken ct = default);
    Task PullAsync(string name, CancellationToken ct = default);
}
