namespace Pcc.Plugins.Iot;

/// <summary>Reads entities from Home Assistant. Abstracted so endpoints/tests can fake it.</summary>
public interface IHomeAssistantClient
{
    Task<IReadOnlyList<IotEntity>> GetEntitiesAsync(CancellationToken cancellationToken = default);
}
