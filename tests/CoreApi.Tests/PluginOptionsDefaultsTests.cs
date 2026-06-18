using CoreApi.Notifications;
using Pcc.Plugins.Calendar;
using Pcc.Plugins.Coding;
using Pcc.Plugins.Iot;
using Pcc.Plugins.Models;
using Pcc.Plugins.Search;
using Pcc.Plugins.Tasks;

namespace CoreApi.Tests;

/// <summary>
/// Each plugin's Options class owns its config defaults, targeting the compose-network deployment, so
/// container runs need no plugin config and docker-compose carries no addresses.
/// </summary>
public class PluginOptionsDefaultsTests
{
    [Fact]
    public void Options_default_to_compose_network_addresses()
    {
        Assert.Equal("http://radicale:5232", new CalendarOptions().BaseUrl);
        Assert.Equal("http://radicale:5232", new TaskOptions().BaseUrl);
        Assert.Equal("http://home-assistant:8123", new IotOptions().HomeAssistant.BaseUrl);
        Assert.Equal("http://searxng:8080", new SearchOptions().BaseUrl);
        Assert.Equal("http://ollama:11434", new ModelsOptions().Ollama.BaseUrl);
        Assert.Equal("http://gpu-exporter:9835/metrics", new ModelsOptions().Gpu.ExporterUrl);
        Assert.Equal("http://wakapi:3000", new CodingOptions().BaseUrl);
        Assert.Equal("http://ntfy:80", new NtfyOptions().BaseUrl);
    }
}
