namespace Pcc.Plugins.Weather;

/// <summary>Fetches weather for the configured location. Abstracted so endpoints/tests can fake it.</summary>
public interface IWeatherClient
{
    Task<Weather> GetAsync(CancellationToken cancellationToken = default);
}
