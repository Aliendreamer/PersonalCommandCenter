using System.Net;
using System.Net.Http.Json;
using CoreApi.Tests.Auth;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Pcc.Plugins.Weather;

namespace CoreApi.Tests;

public class WeatherEndpointTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory = factory;

    private static Weather Sample() => new(
        new WeatherCurrent(12.3, 3, "Overcast"),
        [new ForecastDay("2026-06-15", 3, "Overcast", 18, 9)]);

    [Fact]
    public async Task Returns_current_and_daily()
    {
        var client = AuthedWith(new FakeWeather(Sample()));

        var weather = await client.GetFromJsonAsync<WeatherDto>("/api/weather");

        Assert.NotNull(weather);
        Assert.Equal(12.3, weather!.Current.TemperatureC);
        Assert.Single(weather.Daily);
    }

    [Fact]
    public async Task Requires_authentication()
    {
        var response = await _factory.CreateClient().GetAsync("/api/weather");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Returns_502_when_open_meteo_fails()
    {
        var client = AuthedWith(new ThrowingWeather());
        var response = await client.GetAsync("/api/weather");
        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
    }

    [Fact]
    public async Task Absent_when_disabled()
    {
        Environment.SetEnvironmentVariable("Plugins__Weather__Enabled", "false");
        try
        {
            await using var factory = new WebApplicationFactory<Program>();
            var client = factory.AuthedClient();

            var response = await client.GetAsync("/api/weather");
            var plugins = await client.GetFromJsonAsync<List<PluginDto>>("/api/plugins");

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
            Assert.DoesNotContain(plugins!, p => p.Id == "weather");
        }
        finally
        {
            Environment.SetEnvironmentVariable("Plugins__Weather__Enabled", null);
        }
    }

    private HttpClient AuthedWith(IWeatherClient weather)
    {
        var client = _factory.Authed(s => s.AddSingleton(weather)).CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.Header, "1");
        return client;
    }

    private sealed record WeatherDto(CurrentDto Current, List<DayDto> Daily);

    private sealed record CurrentDto(double TemperatureC, string Condition);

    private sealed record DayDto(string Date, double HighC, double LowC);

    private sealed record PluginDto(string Id);

    private sealed class FakeWeather(Weather weather) : IWeatherClient
    {
        public Task<Weather> GetAsync(CancellationToken ct = default) => Task.FromResult(weather);
    }

    private sealed class ThrowingWeather : IWeatherClient
    {
        public Task<Weather> GetAsync(CancellationToken ct = default) =>
            throw new HttpRequestException("Open-Meteo unreachable");
    }
}
