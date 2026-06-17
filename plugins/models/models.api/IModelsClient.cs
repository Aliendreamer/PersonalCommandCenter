namespace Pcc.Plugins.Models;

/// <summary>Reads the Ollama inventory + GPU telemetry. Abstracted so endpoints/tests can fake it.</summary>
public interface IModelsClient
{
    Task<ModelsStatus> GetStatusAsync(CancellationToken cancellationToken = default);
}
