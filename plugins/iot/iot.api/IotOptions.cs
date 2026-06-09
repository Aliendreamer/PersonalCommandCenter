namespace Pcc.Plugins.Iot;

/// <summary>Bound from the plugin's config section (<c>Plugins:Iot</c>).</summary>
public sealed class IotOptions
{
    public HomeAssistantOptions HomeAssistant { get; set; } = new();

    public string[] Domains { get; set; } = ["light", "switch", "sensor", "binary_sensor"];
}

public sealed class HomeAssistantOptions
{
    public string BaseUrl { get; set; } = "";

    public string Token { get; set; } = "";
}
