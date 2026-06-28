using System.Net;
using System.Net.Http.Json;
using CoreApi.Tests.Auth;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Pcc.Plugins.Mail;

namespace CoreApi.Tests;

public class MailEndpointTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory = factory;

    private static readonly MessageHeader[] SampleHeaders =
    [
        new MessageHeader(1u, "Hello World", "alice@example.com", "bob@example.com",
            DateTimeOffset.UtcNow, false, null, "INBOX"),
        new MessageHeader(2u, "Re: Hello", "bob@example.com", "alice@example.com",
            DateTimeOffset.UtcNow, true, "work", "INBOX"),
    ];

    private static readonly MessageBody SampleBody = new(
        1u, "Hello World", "alice@example.com", "bob@example.com",
        DateTimeOffset.UtcNow, false, "This is the body text.", [], "INBOX");

    // -----------------------------------------------------------------------
    // 1. GetMessages_returns_list
    // -----------------------------------------------------------------------
    [Fact]
    public async Task GetMessages_returns_list()
    {
        var client = AuthedWith(new FakeImap(headers: SampleHeaders), new FakeSmtp(), new FakeOllama("summary"));
        var response = await client.GetAsync("/api/mail/messages");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var items = await response.Content.ReadFromJsonAsync<List<HeaderDto>>();
        Assert.NotNull(items);
        Assert.Equal(2, items!.Count);
    }

    // -----------------------------------------------------------------------
    // 2. GetMessages_returns_502_when_imap_fails
    // -----------------------------------------------------------------------
    [Fact]
    public async Task GetMessages_returns_502_when_imap_fails()
    {
        var client = AuthedWith(new ThrowingImap(), new FakeSmtp(), new FakeOllama("summary"));
        var response = await client.GetAsync("/api/mail/messages");
        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
    }

    // -----------------------------------------------------------------------
    // 3. GetMessage_returns_body
    // -----------------------------------------------------------------------
    [Fact]
    public async Task GetMessage_returns_body()
    {
        var client = AuthedWith(new FakeImap(body: SampleBody), new FakeSmtp(), new FakeOllama("summary"));
        var response = await client.GetAsync("/api/mail/messages/1");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var dto = await response.Content.ReadFromJsonAsync<BodyDto>();
        Assert.NotNull(dto);
        Assert.Equal("This is the body text.", dto!.Body);
    }

    // -----------------------------------------------------------------------
    // 4. Send_returns_201
    // -----------------------------------------------------------------------
    [Fact]
    public async Task Send_returns_201()
    {
        var client = AuthedWith(new FakeImap(body: SampleBody), new FakeSmtp(), new FakeOllama("summary"));
        var response = await client.PostAsJsonAsync("/api/mail/send", new
        {
            to = new[] { "alice@example.com" },
            subject = "Test",
            body = "Hello!"
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    // -----------------------------------------------------------------------
    // 5. Send_returns_400_when_to_empty
    // -----------------------------------------------------------------------
    [Fact]
    public async Task Send_returns_400_when_to_empty()
    {
        var client = AuthedWith(new FakeImap(body: SampleBody), new FakeSmtp(), new FakeOllama("summary"));
        var response = await client.PostAsJsonAsync("/api/mail/send", new
        {
            to = Array.Empty<string>(),
            subject = "Test",
            body = "Hello!"
        });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // -----------------------------------------------------------------------
    // 6. Send_returns_502_when_smtp_fails
    // -----------------------------------------------------------------------
    [Fact]
    public async Task Send_returns_502_when_smtp_fails()
    {
        var client = AuthedWith(new FakeImap(body: SampleBody), new ThrowingSmtp(), new FakeOllama("summary"));
        var response = await client.PostAsJsonAsync("/api/mail/send", new
        {
            to = new[] { "alice@example.com" },
            subject = "Test",
            body = "Hello!"
        });
        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
    }

    // -----------------------------------------------------------------------
    // 7. Summarise_returns_summary
    // -----------------------------------------------------------------------
    [Fact]
    public async Task Summarise_returns_summary()
    {
        var client = AuthedWith(new FakeImap(body: SampleBody), new FakeSmtp(), new FakeOllama("• point one\n• point two\n• point three"));
        var response = await client.PostAsJsonAsync("/api/mail/summarise", new { uid = 1, folder = "INBOX" });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var dto = await response.Content.ReadFromJsonAsync<SummaryDto>();
        Assert.NotNull(dto);
        Assert.Contains("point one", dto!.Summary);
    }

    // -----------------------------------------------------------------------
    // 8. Summarise_returns_503_when_ollama_unreachable
    // -----------------------------------------------------------------------
    [Fact]
    public async Task Summarise_returns_503_when_ollama_unreachable()
    {
        var client = AuthedWith(new FakeImap(body: SampleBody), new FakeSmtp(), new ThrowingOllama());
        var response = await client.PostAsJsonAsync("/api/mail/summarise", new { uid = 1, folder = "INBOX" });
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }

    // -----------------------------------------------------------------------
    // 9. Draft_returns_draft
    // -----------------------------------------------------------------------
    [Fact]
    public async Task Draft_returns_draft()
    {
        var client = AuthedWith(new FakeImap(body: SampleBody), new FakeSmtp(), new FakeOllama("Dear Alice, Thank you for your message."));
        var response = await client.PostAsJsonAsync("/api/mail/draft", new { uid = 1, folder = "INBOX" });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var dto = await response.Content.ReadFromJsonAsync<DraftDto>();
        Assert.NotNull(dto);
        Assert.Contains("Thank you", dto!.Draft);
    }

    // -----------------------------------------------------------------------
    // 10. Tag_returns_tag
    // -----------------------------------------------------------------------
    [Fact]
    public async Task Tag_returns_tag()
    {
        var client = AuthedWith(new FakeImap(body: SampleBody), new FakeSmtp(), new FakeOllama("work"));
        var response = await client.PostAsJsonAsync("/api/mail/tag", new { uid = 1, folder = "INBOX" });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var dto = await response.Content.ReadFromJsonAsync<TagDto>();
        Assert.NotNull(dto);
        Assert.Equal("work", dto!.Tag);
    }

    // -----------------------------------------------------------------------
    // 11. Requires_auth
    // -----------------------------------------------------------------------
    [Fact]
    public async Task Requires_auth()
    {
        var response = await _factory.CreateClient().GetAsync("/api/mail/messages");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // -----------------------------------------------------------------------
    // 12. Absent_when_disabled
    // -----------------------------------------------------------------------
    [Fact]
    public async Task Absent_when_disabled()
    {
        Environment.SetEnvironmentVariable("Plugins__Mail__Enabled", "false");
        try
        {
            await using var factory = new WebApplicationFactory<Program>();
            var client = factory.AuthedClient();

            var response = await client.GetAsync("/api/mail/messages");
            var plugins = await client.GetFromJsonAsync<List<PluginDto>>("/api/plugins");

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
            Assert.DoesNotContain(plugins!, p => p.Id == "mail");
        }
        finally
        {
            Environment.SetEnvironmentVariable("Plugins__Mail__Enabled", null);
        }
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------
    private HttpClient AuthedWith(IImapMailClient imap, ISmtpMailSender smtp, IOllamaMailClient ollama)
    {
        var client = _factory.Authed(s =>
        {
            s.AddSingleton(imap);
            s.AddSingleton(smtp);
            s.AddSingleton(ollama);
        }).CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.Header, "1");
        return client;
    }

    private sealed record HeaderDto(uint Uid, string Subject);

    private sealed record BodyDto(uint Uid, string Body);

    private sealed record SummaryDto(string Summary);

    private sealed record DraftDto(string Draft);

    private sealed record TagDto(string Tag);

    private sealed record PluginDto(string Id);

    private sealed class FakeImap(
        IReadOnlyList<MessageHeader>? headers = null,
        MessageBody? body = null) : IImapMailClient
    {
        public Task<IReadOnlyList<MessageHeader>> GetHeadersAsync(string folder, int limit, int offset, CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<MessageHeader>>(headers ?? []);

        public Task<MessageBody> GetBodyAsync(string folder, uint uid, CancellationToken ct) =>
            Task.FromResult(body ?? throw new InvalidOperationException("No body configured"));
    }

    private sealed class ThrowingImap : IImapMailClient
    {
        public Task<IReadOnlyList<MessageHeader>> GetHeadersAsync(string folder, int limit, int offset, CancellationToken ct) =>
            throw new HttpRequestException("IMAP unreachable");

        public Task<MessageBody> GetBodyAsync(string folder, uint uid, CancellationToken ct) =>
            throw new HttpRequestException("IMAP unreachable");
    }

    private sealed class FakeSmtp : ISmtpMailSender
    {
        public Task SendAsync(SendRequest req, CancellationToken ct) => Task.CompletedTask;
    }

    private sealed class ThrowingSmtp : ISmtpMailSender
    {
        public Task SendAsync(SendRequest req, CancellationToken ct) =>
            throw new HttpRequestException("SMTP unreachable");
    }

    private sealed class FakeOllama(string response) : IOllamaMailClient
    {
        public Task<string> SummariseAsync(string body, CancellationToken ct) => Task.FromResult(response);

        public Task<string> DraftReplyAsync(string body, string from, string? instruction, CancellationToken ct) => Task.FromResult(response);

        public Task<string> TagAsync(string body, string[] tags, CancellationToken ct) => Task.FromResult(response);
    }

    private sealed class ThrowingOllama : IOllamaMailClient
    {
        public Task<string> SummariseAsync(string body, CancellationToken ct) =>
            throw new HttpRequestException("Ollama unreachable");

        public Task<string> DraftReplyAsync(string body, string from, string? instruction, CancellationToken ct) =>
            throw new HttpRequestException("Ollama unreachable");

        public Task<string> TagAsync(string body, string[] tags, CancellationToken ct) =>
            throw new HttpRequestException("Ollama unreachable");
    }
}
