namespace Pcc.Plugins.Network;

public sealed record NetworkDevice(
    string Name,
    string? Ip,
    string? Mac,
    bool Home,
    string? ConnectionType,
    double? DownKbps,
    double? UpKbps,
    int? RssiDbm);

public sealed record NetworkNode(
    string Name,
    bool Online,
    double? CpuPct,      // 0–100
    double? MemPct,      // 0–100
    int? ConnectedDevices,
    double? DownKbps,
    double? UpKbps);

public sealed record NetworkStatus(
    IReadOnlyList<NetworkDevice> Devices,
    IReadOnlyList<NetworkNode> Nodes);
