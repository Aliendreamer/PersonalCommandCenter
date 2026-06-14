namespace Pcc.Plugins.Uptime;

/// <summary>Bound from the plugin's config section (<c>Plugins:Uptime</c>).</summary>
public sealed class UptimeOptions
{
    public UptimeTarget[] Targets { get; set; } = [];

    public int TimeoutSeconds { get; set; } = 5;
}

/// <summary>One service to ping.</summary>
public sealed class UptimeTarget
{
    public string Name { get; set; } = "";

    public string Url { get; set; } = "";
}
