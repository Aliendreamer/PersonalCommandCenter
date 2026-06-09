namespace Pcc.Plugins.Iot;

/// <summary>A Home Assistant entity, slimmed to what the command center renders.</summary>
public sealed record IotEntity(string EntityId, string Name, string Domain, string State, string? Unit);
