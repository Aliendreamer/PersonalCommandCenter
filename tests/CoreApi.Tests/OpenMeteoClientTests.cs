using System.Net;
using Microsoft.Extensions.Options;
using Pcc.Plugins.Weather;

namespace CoreApi.Tests;

public class OpenMeteoClientTests
{
    private const string Json = """
        {
          "current": { "temperature_2m": 12.3, "weather_code": 3 },
          "daily": {
            "time": ["2026-06-15", "2026-06-16"],
            "weather_code": [3, 61],
            "temperature_2m_max": [18.0, 16.0],
            "temperature_2m_min": [9.0, 8.0]
          }
        }
        """;

    [Fact]
    public async Task Maps_current_and_daily_with_wmo_conditions()
    {
        var client = CreateClient(Json, out _);

        var weather = await client.GetAsync();

        Assert.Equal(12.3, weather.Current.TemperatureC);
        Assert.Equal("Overcast", weather.Current.Condition);
        Assert.Equal(2, weather.Daily.Count);
        Assert.Equal("2026-06-15", weather.Daily[0].Date);
        Assert.Equal(18.0, weather.Daily[0].HighC);
        Assert.Equal("Rain", weather.Daily[1].Condition);
    }

    [Fact]
    public async Task Requests_the_configured_location_with_daily_fields()
    {
        var client = CreateClient(Json, out var handler);

        await client.GetAsync();

        var uri = handler.LastRequest!.RequestUri!.AbsoluteUri;
        Assert.Contains("latitude=51.5", uri, StringComparison.Ordinal);
        Assert.Contains("longitude=-0.12", uri, StringComparison.Ordinal);
        Assert.Contains("daily=weather_code", uri, StringComparison.Ordinal);
        Assert.Contains("timezone=auto", uri, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData(0, "Clear")]
    [InlineData(45, "Fog")]
    [InlineData(95, "Thunderstorm")]
    [InlineData(999, "Unknown")]
    public void Wmo_codes_map_to_conditions(int code, string expected) =>
        Assert.Equal(expected, WmoCodes.Describe(code));

    private static OpenMeteoClient CreateClient(string json, out StubHandler handler)
    {
        handler = new StubHandler(json);
        var options = Options.Create(new WeatherOptions
        {
            BaseUrl = "https://api.open-meteo.test",
            Latitude = 51.5074,
            Longitude = -0.1278,
            ForecastDays = 5,
        });
        return new OpenMeteoClient(new HttpClient(handler), options);
    }

    private sealed class StubHandler(string json) : HttpMessageHandler
    {
        public HttpRequestMessage? LastRequest { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            LastRequest = request;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json, System.Text.Encoding.UTF8, "application/json"),
            });
        }
    }
}
