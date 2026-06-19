using System.Net;
using System.Net.Http.Json;
using CoreApi.Tests.Auth;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Pcc.Plugins.Coding;

namespace CoreApi.Tests;

public class CodingEndpointTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory = factory;

    private static CodingStatus Sample() => new(
        "week",
        1612,
        200,
        [
            new CodingDay("2026-06-15", 1412, [], []),
            new CodingDay(
                "2026-06-18",
                200,
                [new CodingBucket("PersonalCommandCenter", 120)],
                [new CodingBucket("C#", 200)]),
        ],
        [new CodingBucket("PersonalCommandCenter", 1532), new CodingBucket("aidoctor", 80)],
        [new CodingBucket("Markdown", 1412), new CodingBucket("C#", 200)]);

    [Fact]
    public async Task Returns_coding_summary_with_per_day_breakdowns()
    {
        var client = AuthedWith(new FakeCoding(Sample()));

        var status = await client.GetFromJsonAsync<StatusDto>("/api/coding");

        Assert.NotNull(status);
        Assert.Equal("week", status!.Range);
        Assert.Equal(1612, status.TotalSeconds);
        Assert.Equal(200, status.TodaySeconds);
        Assert.Equal(2, status.Days.Count);
        Assert.Contains(status.Days[1].Languages, l => l.Name == "C#");
        Assert.Contains(status.Projects, p => p.Name == "PersonalCommandCenter");
    }

    [Fact]
    public async Task Passes_the_range_query_to_the_client()
    {
        var client = AuthedWith(new FakeCoding(Sample()));

        var status = await client.GetFromJsonAsync<StatusDto>("/api/coding?range=month");

        Assert.Equal("month", status!.Range);
    }

    [Fact]
    public async Task Defaults_invalid_range_to_week()
    {
        var client = AuthedWith(new FakeCoding(Sample()));

        var status = await client.GetFromJsonAsync<StatusDto>("/api/coding?range=bogus");

        Assert.Equal("week", status!.Range);
    }

    [Fact]
    public async Task Requires_authentication()
    {
        var response = await _factory.CreateClient().GetAsync("/api/coding");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Returns_502_when_wakapi_fails()
    {
        var client = AuthedWith(new ThrowingCoding());
        var response = await client.GetAsync("/api/coding");
        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
    }

    [Fact]
    public async Task Absent_when_disabled()
    {
        Environment.SetEnvironmentVariable("Plugins__Coding__Enabled", "false");
        try
        {
            await using var factory = new WebApplicationFactory<Program>();
            var client = factory.AuthedClient();

            var response = await client.GetAsync("/api/coding");
            var plugins = await client.GetFromJsonAsync<List<PluginDto>>("/api/plugins");

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
            Assert.DoesNotContain(plugins!, p => p.Id == "coding");
        }
        finally
        {
            Environment.SetEnvironmentVariable("Plugins__Coding__Enabled", null);
        }
    }

    private HttpClient AuthedWith(ICodingClient coding)
    {
        var client = _factory.Authed(s => s.AddSingleton(coding)).CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.Header, "1");
        return client;
    }

    private sealed record StatusDto(
        string Range,
        long TotalSeconds,
        long TodaySeconds,
        List<DayDto> Days,
        List<BucketDto> Projects,
        List<BucketDto> Languages);

    private sealed record DayDto(
        string Date, long Seconds, List<BucketDto> Projects, List<BucketDto> Languages);

    private sealed record BucketDto(string Name, long Seconds);

    private sealed record PluginDto(string Id);

    private sealed class FakeCoding(CodingStatus status) : ICodingClient
    {
        // The endpoint validates the range, so echo the requested range back in the response.
        public Task<CodingStatus> GetStatusAsync(string range, CancellationToken ct = default) =>
            Task.FromResult(status with { Range = range });
    }

    private sealed class ThrowingCoding : ICodingClient
    {
        public Task<CodingStatus> GetStatusAsync(string range, CancellationToken ct = default) =>
            throw new HttpRequestException("wakapi unreachable");
    }
}
