using FastEndpoints;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Pcc.Plugins.Weather;

/// <summary>Read-only weather plugin: current + daily forecast for a configured location.</summary>
public sealed class WeatherPlugin : IPlugin
{
    public string Id => "weather";

    public PluginManifest Manifest { get; } = new("weather", "Weather", "/weather", ["weather-today"]);

    public void Configure(IServiceCollection services, IConfiguration config)
    {
        services.Configure<WeatherOptions>(config);
        services.AddHttpClient<IWeatherClient, OpenMeteoClient>();
    }
}

/// <summary><c>GET /api/weather</c> — current conditions + a short daily forecast.</summary>
internal sealed class GetWeatherEndpoint : EndpointWithoutRequest<Weather>
{
    public override void Configure() => Get("/weather");

    public override async Task HandleAsync(CancellationToken ct)
    {
        var client = Resolve<IWeatherClient>();
        try
        {
            await Send.OkAsync(await client.GetAsync(ct), ct);
        }
        catch (Exception)
        {
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status502BadGateway));
        }
    }
}
