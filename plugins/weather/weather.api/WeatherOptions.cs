namespace Pcc.Plugins.Weather;

/// <summary>Bound from the plugin's config section (<c>Plugins:Weather</c>).</summary>
public sealed class WeatherOptions
{
    public string BaseUrl { get; set; } = "https://api.open-meteo.com";

    public double Latitude { get; set; }

    public double Longitude { get; set; }

    public int ForecastDays { get; set; } = 5;
}
