using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace Pcc.Plugins.Weather;

/// <summary>Calls the Open-Meteo forecast API and maps the response.</summary>
public sealed class OpenMeteoClient(HttpClient http, IOptions<WeatherOptions> options) : IWeatherClient
{
    private readonly WeatherOptions _options = options.Value;

    public async Task<Weather> GetAsync(CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(_options.BaseUrl))
        {
            throw new InvalidOperationException("Weather:BaseUrl is not configured.");
        }

        var lat = _options.Latitude.ToString(CultureInfo.InvariantCulture);
        var lon = _options.Longitude.ToString(CultureInfo.InvariantCulture);
        var days = _options.ForecastDays.ToString(CultureInfo.InvariantCulture);
        var url = $"{_options.BaseUrl.TrimEnd('/')}/v1/forecast?latitude={lat}&longitude={lon}"
            + "&current=temperature_2m,weather_code"
            + "&daily=weather_code,temperature_2m_max,temperature_2m_min"
            + $"&timezone=auto&forecast_days={days}";

        using var response = await http.GetAsync(new Uri(url), cancellationToken);
        response.EnsureSuccessStatusCode();

        var payload = await response.Content.ReadFromJsonAsync<ForecastResponse>(cancellationToken)
            ?? throw new InvalidOperationException("Open-Meteo returned no data.");

        var current = new WeatherCurrent(
            payload.Current?.Temperature ?? 0,
            payload.Current?.Code ?? 0,
            WmoCodes.Describe(payload.Current?.Code ?? 0));

        var daily = new List<ForecastDay>();
        var d = payload.Daily;
        if (d?.Time is { } time)
        {
            for (var i = 0; i < time.Count; i++)
            {
                var code = d.Code is { } c && i < c.Count ? c[i] : 0;
                daily.Add(new ForecastDay(
                    time[i],
                    code,
                    WmoCodes.Describe(code),
                    d.Max is { } mx && i < mx.Count ? mx[i] : 0,
                    d.Min is { } mn && i < mn.Count ? mn[i] : 0));
            }
        }

        return new Weather(current, daily);
    }

    private sealed record ForecastResponse(
        [property: JsonPropertyName("current")] CurrentBlock? Current,
        [property: JsonPropertyName("daily")] DailyBlock? Daily);

    private sealed record CurrentBlock(
        [property: JsonPropertyName("temperature_2m")] double Temperature,
        [property: JsonPropertyName("weather_code")] int Code);

    private sealed record DailyBlock(
        [property: JsonPropertyName("time")] List<string>? Time,
        [property: JsonPropertyName("weather_code")] List<int>? Code,
        [property: JsonPropertyName("temperature_2m_max")] List<double>? Max,
        [property: JsonPropertyName("temperature_2m_min")] List<double>? Min);
}
