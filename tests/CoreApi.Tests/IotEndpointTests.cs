using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Pcc.Plugins.Iot;

namespace CoreApi.Tests;

public class IotEndpointTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory = factory;

    [Fact]
    public async Task Lists_entities_when_enabled()
    {
        var entities = new List<IotEntity> { new("light.kitchen", "Kitchen", "light", "on", null) };
        var client = WithHaClient(new FakeClient(entities)).CreateClient();

        var result = await client.GetFromJsonAsync<List<EntityDto>>("/api/iot/entities");

        Assert.NotNull(result);
        Assert.Contains(result, e => e.EntityId == "light.kitchen");
    }

    [Fact]
    public async Task Returns_502_when_home_assistant_fails()
    {
        var client = WithHaClient(new ThrowingClient()).CreateClient();

        var response = await client.GetAsync("/api/iot/entities");

        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
    }

    [Fact]
    public async Task Absent_when_disabled()
    {
        Environment.SetEnvironmentVariable("Plugins__Iot__Enabled", "false");
        try
        {
            await using var factory = new WebApplicationFactory<Program>();
            var client = factory.CreateClient();

            var entitiesResponse = await client.GetAsync("/api/iot/entities");
            var plugins = await client.GetFromJsonAsync<List<PluginDto>>("/api/plugins");

            Assert.Equal(HttpStatusCode.NotFound, entitiesResponse.StatusCode);
            Assert.NotNull(plugins);
            Assert.DoesNotContain(plugins, p => p.Id == "iot");
        }
        finally
        {
            Environment.SetEnvironmentVariable("Plugins__Iot__Enabled", null);
        }
    }

    private WebApplicationFactory<Program> WithHaClient(IHomeAssistantClient client) =>
        _factory.WithWebHostBuilder(builder =>
            builder.ConfigureTestServices(services => services.AddSingleton(client)));

    private sealed record EntityDto(string EntityId, string Name, string Domain, string State, string? Unit);

    private sealed record PluginDto(string Id);

    private sealed class FakeClient(IReadOnlyList<IotEntity> entities) : IHomeAssistantClient
    {
        public Task<IReadOnlyList<IotEntity>> GetEntitiesAsync(CancellationToken cancellationToken = default) =>
            Task.FromResult(entities);
    }

    private sealed class ThrowingClient : IHomeAssistantClient
    {
        public Task<IReadOnlyList<IotEntity>> GetEntitiesAsync(CancellationToken cancellationToken = default) =>
            throw new HttpRequestException("Home Assistant unreachable");
    }
}
