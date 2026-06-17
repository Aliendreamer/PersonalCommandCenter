using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using OpenTelemetry.Trace;

namespace CoreApi.Tests;

public class TelemetryTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory = factory;

    [Fact]
    public void OpenTelemetry_tracing_is_registered()
    {
        // The host wires OpenTelemetry; the TracerProvider must resolve from DI.
        var tracerProvider = _factory.Services.GetService<TracerProvider>();

        Assert.NotNull(tracerProvider);
    }

    [Fact]
    public async Task App_serves_with_no_collector_reachable()
    {
        // No OTLP collector is running in tests — the app must still start and serve
        // (exporter failures are non-fatal).
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
