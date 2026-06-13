using System.Net;
using System.Net.Http.Json;
using CoreApi.Tests.Auth;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Pcc.Plugins.Iot;

namespace CoreApi.Tests;

public class IotEndpointTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory = factory;

    [Fact]
    public async Task Lists_entities_when_enabled_and_authenticated()
    {
        var entities = new List<IotEntity> { new("light.kitchen", "Kitchen", "light", "on", null) };
        var client = AuthedWithHa(new FakeClient(entities));

        var result = await client.GetFromJsonAsync<List<EntityDto>>("/api/iot/entities");

        Assert.NotNull(result);
        Assert.Contains(result, e => e.EntityId == "light.kitchen");
    }

    [Fact]
    public async Task Requires_authentication()
    {
        var response = await _factory.CreateClient().GetAsync("/api/iot/entities");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Returns_502_when_home_assistant_fails()
    {
        var client = AuthedWithHa(new ThrowingClient());

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
            var client = factory.AuthedClient();

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

    private HttpClient AuthedWithHa(IHomeAssistantClient ha)
    {
        var client = _factory.Authed(s => s.AddSingleton(ha)).CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.Header, "1");
        return client;
    }

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
