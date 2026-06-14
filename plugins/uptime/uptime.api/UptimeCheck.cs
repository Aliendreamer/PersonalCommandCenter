namespace Pcc.Plugins.Uptime;

/// <summary>The result of pinging one configured target.</summary>
public sealed record UptimeCheck(string Name, string Url, bool Up, int? StatusCode, long LatencyMs);
