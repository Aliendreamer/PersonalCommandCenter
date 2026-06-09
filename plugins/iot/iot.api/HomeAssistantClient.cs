using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace Pcc.Plugins.Iot;

/// <summary>Calls Home Assistant's REST API and maps states to <see cref="IotEntity"/>.</summary>
public sealed class HomeAssistantClient(HttpClient http, IOptions<IotOptions> options) : IHomeAssistantClient
{
    private readonly IotOptions _options = options.Value;

    public async Task<IReadOnlyList<IotEntity>> GetEntitiesAsync(CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{_options.HomeAssistant.BaseUrl.TrimEnd('/')}/api/states");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.HomeAssistant.Token);

        using var response = await http.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        var states = await response.Content.ReadFromJsonAsync<List<HaState>>(cancellationToken) ?? [];
        var domains = _options.Domains.ToHashSet(StringComparer.OrdinalIgnoreCase);

        return states.Select(Map).Where(entity => domains.Contains(entity.Domain)).ToList();
    }

    private static IotEntity Map(HaState state)
    {
        var domain = state.EntityId.Split('.', 2)[0];
        var name = state.Attributes?.FriendlyName ?? state.EntityId;
        return new IotEntity(state.EntityId, name, domain, state.State, state.Attributes?.UnitOfMeasurement);
    }

    private sealed record HaState(
        [property: JsonPropertyName("entity_id")] string EntityId,
        [property: JsonPropertyName("state")] string State,
        [property: JsonPropertyName("attributes")] HaAttributes? Attributes);

    private sealed record HaAttributes(
        [property: JsonPropertyName("friendly_name")] string? FriendlyName,
        [property: JsonPropertyName("unit_of_measurement")] string? UnitOfMeasurement);
}
