namespace Pcc.Plugins.Network;

public sealed class NetworkOptions
{
    public HomeAssistantOptions HomeAssistant { get; set; } = new();
    // Prefix to identify node sensor entities (entity_id contains this prefix)
    public string NodeEntityPrefix { get; set; } = "deco";
}

public sealed class HomeAssistantOptions
{
    public string BaseUrl { get; set; } = "http://home-assistant:8123";
    public string Token { get; set; } = "";
}
