using System.Net;
using System.Text;
using Microsoft.Extensions.Options;
using Pcc.Plugins.Coding;

namespace CoreApi.Tests;

public class CodingClientTests
{
    // A two-day Wakapi `summaries?range=week` payload (snake_case, like the live compat API).
    private const string Week = """
        {
          "data": [
            {
              "grand_total": { "total_seconds": 1412 },
              "range": { "start": "2026-06-15T00:00:00+03:00" },
              "projects": [ { "name": "PersonalCommandCenter", "total_seconds": 1412 } ],
              "languages": [ { "name": "Markdown", "total_seconds": 1412 } ]
            },
            {
              "grand_total": { "total_seconds": 200 },
              "range": { "start": "2026-06-18T00:00:00+03:00" },
              "projects": [
                { "name": "PersonalCommandCenter", "total_seconds": 120 },
                { "name": "aidoctor", "total_seconds": 80 }
              ],
              "languages": [ { "name": "C#", "total_seconds": 200 } ]
            }
          ],
          "cumulative_total": { "seconds": 1612 }
        }
        """;

    [Fact]
    public async Task Maps_week_today_days_and_aggregated_breakdowns()
    {
        var client = Create(out _, Week);

        var status = await client.GetStatusAsync();

        Assert.Equal(1612, status.WeekSeconds);
        Assert.Equal(200, status.TodaySeconds); // last day element
        Assert.Equal(["2026-06-15", "2026-06-18"], status.Days.Select(d => d.Date));
        Assert.Equal([1412, 200], status.Days.Select(d => d.Seconds));

        // Projects summed by name across the week, descending.
        Assert.Equal("PersonalCommandCenter", status.Projects[0].Name);
        Assert.Equal(1532, status.Projects[0].Seconds);
        Assert.Equal("aidoctor", status.Projects[1].Name);
        Assert.Equal(80, status.Projects[1].Seconds);

        Assert.Equal("Markdown", status.Languages[0].Name);
        Assert.Equal(1412, status.Languages[0].Seconds);
    }

    [Fact]
    public async Task Sends_basic_auth_with_base64_api_key()
    {
        var client = Create(out var handler, Week, apiKey: "secret-key");

        await client.GetStatusAsync();

        Assert.Equal("Basic", handler.LastAuth?.Scheme);
        Assert.Equal(Convert.ToBase64String(Encoding.UTF8.GetBytes("secret-key")), handler.LastAuth?.Parameter);
        Assert.Contains("/summaries", handler.LastUri!.AbsoluteUri, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Throws_when_api_key_missing()
    {
        var client = Create(out _, Week, apiKey: "");

        await Assert.ThrowsAnyAsync<Exception>(() => client.GetStatusAsync());
    }

    [Fact]
    public async Task Throws_when_wakapi_unreachable()
    {
        var client = Create(out _, Week, ok: false);

        await Assert.ThrowsAnyAsync<Exception>(() => client.GetStatusAsync());
    }

    private static CodingClient Create(out StubHandler handler, string body, string apiKey = "k", bool ok = true)
    {
        handler = new StubHandler(body, ok);
        var options = Options.Create(new CodingOptions { BaseUrl = "http://wakapi.test:3000", ApiKey = apiKey });
        return new CodingClient(new HttpClient(handler), options);
    }

    private sealed class StubHandler(string body, bool ok) : HttpMessageHandler
    {
        public System.Net.Http.Headers.AuthenticationHeaderValue? LastAuth { get; private set; }

        public Uri? LastUri { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            LastAuth = request.Headers.Authorization;
            LastUri = request.RequestUri;
            if (!ok)
            {
                throw new HttpRequestException("wakapi down");
            }

            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(body),
            });
        }
    }
}
