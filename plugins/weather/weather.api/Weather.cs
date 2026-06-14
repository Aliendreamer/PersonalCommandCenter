namespace Pcc.Plugins.Weather;

/// <summary>Current conditions for the configured location.</summary>
public sealed record WeatherCurrent(double TemperatureC, int Code, string Condition);

/// <summary>One day of the forecast.</summary>
public sealed record ForecastDay(string Date, int Code, string Condition, double HighC, double LowC);

/// <summary>Current weather + a short daily forecast.</summary>
public sealed record Weather(WeatherCurrent Current, IReadOnlyList<ForecastDay> Daily);

/// <summary>Maps WMO weather codes (Open-Meteo) to a human condition label.</summary>
public static class WmoCodes
{
    public static string Describe(int code) => code switch
    {
        0 => "Clear",
        1 => "Mainly clear",
        2 => "Partly cloudy",
        3 => "Overcast",
        45 or 48 => "Fog",
        51 or 53 or 55 or 56 or 57 => "Drizzle",
        61 or 63 or 65 or 66 or 67 => "Rain",
        71 or 73 or 75 or 77 => "Snow",
        80 or 81 or 82 => "Rain showers",
        85 or 86 => "Snow showers",
        95 or 96 or 99 => "Thunderstorm",
        _ => "Unknown",
    };
}
