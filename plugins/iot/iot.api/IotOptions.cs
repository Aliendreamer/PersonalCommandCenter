namespace Pcc.Plugins.Iot;

/// <summary>Bound from the plugin's config section (<c>Plugins:Iot</c>).</summary>
public sealed class IotOptions
{
    public HomeAssistantOptions HomeAssistant { get; set; } = new();

    public string[] Domains { get; set; } = ["light", "switch", "sensor", "binary_sensor"];
}

public sealed class HomeAssistantOptions
{
    /// <summary>Home Assistant base URL; defaults to the compose-network instance.</summary>
    public string BaseUrl { get; set; } = "http://home-assistant:8123";

    public string Token { get; set; } = "";
}
