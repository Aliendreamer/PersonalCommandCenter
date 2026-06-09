using System.Net;
using Microsoft.Extensions.Options;
using Pcc.Plugins.Iot;

namespace CoreApi.Tests;

public class HomeAssistantClientTests
{
    private const string StatesJson = """
        [
          { "entity_id": "light.kitchen", "state": "on",
            "attributes": { "friendly_name": "Kitchen Light" } },
          { "entity_id": "sensor.temp", "state": "21.5",
            "attributes": { "friendly_name": "Temp", "unit_of_measurement": "°C" } },
          { "entity_id": "person.alex", "state": "home", "attributes": {} }
        ]
        """;

    [Fact]
    public async Task Maps_and_filters_entities_by_domain()
    {
        var client = CreateClient(StatesJson, domains: ["light", "sensor"], out _);

        var entities = await client.GetEntitiesAsync();

        Assert.Collection(
            entities,
            e =>
            {
                Assert.Equal("light.kitchen", e.EntityId);
                Assert.Equal("Kitchen Light", e.Name);
                Assert.Equal("light", e.Domain);
                Assert.Equal("on", e.State);
            },
            e =>
            {
                Assert.Equal("sensor.temp", e.EntityId);
                Assert.Equal("°C", e.Unit);
            });
    }

    [Fact]
    public async Task Sends_bearer_token_to_states_endpoint()
    {
        var client = CreateClient(StatesJson, domains: ["light"], out var handler);

        await client.GetEntitiesAsync();

        Assert.NotNull(handler.LastRequest);
        Assert.EndsWith("/api/states", handler.LastRequest!.RequestUri!.AbsoluteUri);
        Assert.Equal("Bearer", handler.LastRequest.Headers.Authorization!.Scheme);
        Assert.Equal("test-token", handler.LastRequest.Headers.Authorization.Parameter);
    }

    private static HomeAssistantClient CreateClient(string json, string[] domains, out StubHandler handler)
    {
        handler = new StubHandler(json);
        var http = new HttpClient(handler);
        var options = Options.Create(
            new IotOptions
            {
                HomeAssistant = new HomeAssistantOptions
                {
                    BaseUrl = "http://ha.test:8123",
                    Token = "test-token",
                },
                Domains = domains,
            });
        return new HomeAssistantClient(http, options);
    }

    private sealed class StubHandler(string json) : HttpMessageHandler
    {
        public HttpRequestMessage? LastRequest { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            LastRequest = request;
            return Task.FromResult(
                new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(json, System.Text.Encoding.UTF8, "application/json"),
                });
        }
    }
}
