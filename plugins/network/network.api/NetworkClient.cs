using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace Pcc.Plugins.Network;

/// <summary>Calls Home Assistant's REST API and maps states to <see cref="NetworkStatus"/>.</summary>
public sealed class NetworkClient(HttpClient http, IOptions<NetworkOptions> options) : INetworkClient
{
    private static readonly string[] MetricSuffixes =
    [
        "_cpu_usage",
        "_memory_usage",
        "_connected_devices",
        "_download_kilobytes_per_s",
        "_upload_kilobytes_per_s",
        "_internet_online",
    ];

    private static readonly string[] FriendlyNameSuffixes =
    [
        " CPU usage",
        " Memory usage",
        " Connected devices",
        " Download kilobytes per s",
        " Upload kilobytes per s",
        " Internet online",
    ];

    public async Task<NetworkStatus> GetStatusAsync(CancellationToken ct = default)
    {
        var opts = options.Value;
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{opts.HomeAssistant.BaseUrl.TrimEnd('/')}/api/states");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", opts.HomeAssistant.Token);

        using var response = await http.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();

        var states = await response.Content.ReadFromJsonAsync<List<HaState>>(ct) ?? [];

        var devices = ParseDevices(states);
        var nodes = ParseNodes(states, opts.NodeEntityPrefix);

        return new NetworkStatus(devices, nodes);
    }

    private static IReadOnlyList<NetworkDevice> ParseDevices(List<HaState> states)
    {
        return states
            .Where(s =>
                s.EntityId.StartsWith("device_tracker.", StringComparison.OrdinalIgnoreCase) &&
                GetStr(s.Attributes, "source_type") == "router")
            .Select(s => new NetworkDevice(
                Name: GetStr(s.Attributes, "friendly_name") ?? s.EntityId,
                Ip: GetStr(s.Attributes, "ip"),
                Mac: GetStr(s.Attributes, "mac"),
                Home: s.State == "home",
                ConnectionType: GetStr(s.Attributes, "connection_type"),
                DownKbps: GetDouble(s.Attributes, "down_kilobytes_per_s"),
                UpKbps: GetDouble(s.Attributes, "up_kilobytes_per_s"),
                RssiDbm: GetInt(s.Attributes, "rssi_dbm")))
            .OrderBy(d => d.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static IReadOnlyList<NetworkNode> ParseNodes(List<HaState> states, string nodeEntityPrefix)
    {
        // Filter sensor/binary_sensor states that contain the node prefix
        var nodeStates = states
            .Where(s =>
                (s.EntityId.StartsWith("sensor.", StringComparison.OrdinalIgnoreCase) ||
                 s.EntityId.StartsWith("binary_sensor.", StringComparison.OrdinalIgnoreCase)) &&
                s.EntityId.Contains(nodeEntityPrefix, StringComparison.OrdinalIgnoreCase))
            .ToList();

        // Build a lookup by entity_id for fast access
        var byId = nodeStates.ToDictionary(s => s.EntityId, StringComparer.OrdinalIgnoreCase);

        // Group by slug (part after the dot, with metric suffix stripped)
        var groups = nodeStates
            .GroupBy(s => ExtractSlug(s.EntityId), StringComparer.OrdinalIgnoreCase);

        var nodes = new List<NetworkNode>();
        foreach (var group in groups)
        {
            var slug = group.Key;

            // Derive a human-readable name from any available friendly_name
            var friendlyName = group
                .Select(s => GetStr(s.Attributes, "friendly_name"))
                .FirstOrDefault(n => !string.IsNullOrEmpty(n));
            var name = NodeNameFromFriendlyName(friendlyName, slug);

            // Look up specific entity states
            var onlineId = $"binary_sensor.{slug}_internet_online";
            var cpuId = $"sensor.{slug}_cpu_usage";
            var memId = $"sensor.{slug}_memory_usage";
            var connId = $"sensor.{slug}_connected_devices";
            var downId = $"sensor.{slug}_download_kilobytes_per_s";
            var upId = $"sensor.{slug}_upload_kilobytes_per_s";

            bool online = byId.TryGetValue(onlineId, out var onlineState) &&
                          onlineState.State == "on";

            double? cpuPct = byId.TryGetValue(cpuId, out var cpuState) &&
                             double.TryParse(cpuState.State, System.Globalization.NumberStyles.Any,
                                 System.Globalization.CultureInfo.InvariantCulture, out var cpuVal)
                ? cpuVal * 100.0
                : null;

            double? memPct = byId.TryGetValue(memId, out var memState) &&
                             double.TryParse(memState.State, System.Globalization.NumberStyles.Any,
                                 System.Globalization.CultureInfo.InvariantCulture, out var memVal)
                ? memVal * 100.0
                : null;

            int? connectedDevices = byId.TryGetValue(connId, out var connState) &&
                                    int.TryParse(connState.State, out var connVal)
                ? connVal
                : null;

            double? downKbps = byId.TryGetValue(downId, out var downState) &&
                               double.TryParse(downState.State, System.Globalization.NumberStyles.Any,
                                   System.Globalization.CultureInfo.InvariantCulture, out var downVal)
                ? downVal
                : null;

            double? upKbps = byId.TryGetValue(upId, out var upState) &&
                             double.TryParse(upState.State, System.Globalization.NumberStyles.Any,
                                 System.Globalization.CultureInfo.InvariantCulture, out var upVal)
                ? upVal
                : null;

            nodes.Add(new NetworkNode(
                Name: name,
                Online: online,
                CpuPct: cpuPct,
                MemPct: memPct,
                ConnectedDevices: connectedDevices,
                DownKbps: downKbps,
                UpKbps: upKbps));
        }

        return nodes.OrderBy(n => n.Name, StringComparer.OrdinalIgnoreCase).ToList();
    }

    /// <summary>
    /// Extracts the node slug from an entity_id by taking the part after the dot
    /// and stripping any known metric suffix.
    /// e.g. "sensor.deco_living_room_cpu_usage" → "deco_living_room"
    /// </summary>
    private static string ExtractSlug(string entityId)
    {
        var dotIndex = entityId.IndexOf('.', StringComparison.Ordinal);
        var rest = dotIndex >= 0 ? entityId[(dotIndex + 1)..] : entityId;

        foreach (var suffix in MetricSuffixes)
        {
            if (rest.EndsWith(suffix, StringComparison.OrdinalIgnoreCase))
            {
                return rest[..^suffix.Length];
            }
        }

        return rest;
    }

    private static string NodeNameFromFriendlyName(string? friendlyName, string slug)
    {
        if (string.IsNullOrEmpty(friendlyName))
        {
            return slug;
        }

        foreach (var suffix in FriendlyNameSuffixes)
        {
            if (friendlyName.EndsWith(suffix, StringComparison.OrdinalIgnoreCase))
            {
                return friendlyName[..^suffix.Length];
            }
        }
        return friendlyName;
    }

    private static string? GetStr(Dictionary<string, JsonElement>? attrs, string key)
        => attrs?.TryGetValue(key, out var v) == true && v.ValueKind == JsonValueKind.String
            ? v.GetString() : null;

    private static double? GetDouble(Dictionary<string, JsonElement>? attrs, string key)
        => attrs?.TryGetValue(key, out var v) == true && v.ValueKind == JsonValueKind.Number
            ? v.GetDouble() : null;

    private static int? GetInt(Dictionary<string, JsonElement>? attrs, string key)
        => attrs?.TryGetValue(key, out var v) == true && v.ValueKind == JsonValueKind.Number
            ? v.GetInt32() : null;

    private sealed record HaState(
        [property: JsonPropertyName("entity_id")] string EntityId,
        [property: JsonPropertyName("state")] string State,
        [property: JsonPropertyName("attributes")] Dictionary<string, JsonElement>? Attributes);
}
