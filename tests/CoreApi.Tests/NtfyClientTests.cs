using System.Net;
using CoreApi.Notifications;
using Microsoft.Extensions.Options;
using Pcc.Plugins;

namespace CoreApi.Tests;

public class NtfyClientTests
{
    [Fact]
    public async Task Does_not_post_when_the_base_url_scheme_is_not_http()
    {
        // Defense-in-depth: a non-http(s) BaseUrl is treated as "not configured" — delivery is skipped,
        // not dereferenced.
        var handler = new CountingHandler();
        var client = new NtfyClient(new HttpClient(handler),
            Options.Create(new NtfyOptions { BaseUrl = "file:///tmp", Topic = "pcc" }));

        await client.PublishAsync(NotificationSeverity.Info, "title", "message");

        Assert.Equal(0, handler.Calls);
    }

    [Fact]
    public async Task Posts_to_the_topic_for_an_http_base_url()
    {
        var handler = new CountingHandler();
        var client = new NtfyClient(new HttpClient(handler),
            Options.Create(new NtfyOptions { BaseUrl = "http://ntfy.test", Topic = "pcc" }));

        await client.PublishAsync(NotificationSeverity.Info, "title", "message");

        Assert.Equal(1, handler.Calls);
        Assert.Equal("http://ntfy.test/pcc", handler.LastUri!.AbsoluteUri);
    }

    private sealed class CountingHandler : HttpMessageHandler
    {
        public int Calls { get; private set; }

        public Uri? LastUri { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Calls++;
            LastUri = request.RequestUri;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK));
        }
    }
}
