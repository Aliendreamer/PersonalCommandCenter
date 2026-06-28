using FastEndpoints;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Pcc.Plugins.Mail;

public sealed class MailPlugin : IPlugin
{
    public string Id => "mail";

    public PluginManifest Manifest { get; } = new("mail", "Mail", "/mail", ["mail-unread"]);

    public void Configure(IServiceCollection services, IConfiguration config)
    {
        services.Configure<MailOptions>(config);
        services.AddHttpClient<IOllamaMailClient, OllamaMailClient>();
        services.AddTransient<IImapMailClient, ImapMailClient>();
        services.AddTransient<ISmtpMailSender, SmtpMailSender>();
    }
}

// ---------------------------------------------------------------------------
// GET /api/mail/messages?folder=INBOX&limit=20&offset=0
// ---------------------------------------------------------------------------

internal sealed class GetMailMessagesEndpoint : EndpointWithoutRequest<IReadOnlyList<MessageHeader>>
{
    public override void Configure() => Get("/mail/messages");

    public override async Task HandleAsync(CancellationToken ct)
    {
        var imap = Resolve<IImapMailClient>();

        var folder = Query<string?>("folder", isRequired: false) ?? "INBOX";
        var limitRaw = Query<string?>("limit", isRequired: false);
        var offsetRaw = Query<string?>("offset", isRequired: false);
        var limit = int.TryParse(limitRaw, out var l) && l > 0 ? Math.Min(l, 100) : 20;
        var offset = int.TryParse(offsetRaw, out var o) && o >= 0 ? o : 0;

        try
        {
            var headers = await imap.GetHeadersAsync(folder, limit, offset, ct);
            await Send.OkAsync(headers, ct);
        }
        catch (Exception)
        {
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status502BadGateway));
        }
    }
}

// ---------------------------------------------------------------------------
// GET /api/mail/messages/{uid}?folder=INBOX
// ---------------------------------------------------------------------------

internal sealed class GetMailMessageEndpoint : EndpointWithoutRequest<MessageBody>
{
    public override void Configure() => Get("/mail/messages/{uid}");

    public override async Task HandleAsync(CancellationToken ct)
    {
        var imap = Resolve<IImapMailClient>();

        var uidStr = Route<string>("uid");
        if (!uint.TryParse(uidStr, out var uid))
        {
            await Send.ResultAsync(Results.BadRequest(new { error = "uid must be a positive integer" }));
            return;
        }

        var folder = Query<string?>("folder", isRequired: false) ?? "INBOX";

        try
        {
            var body = await imap.GetBodyAsync(folder, uid, ct);
            await Send.OkAsync(body, ct);
        }
        catch (Exception)
        {
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status502BadGateway));
        }
    }
}

// ---------------------------------------------------------------------------
// POST /api/mail/send
// ---------------------------------------------------------------------------

internal sealed class SendMailEndpoint : Endpoint<SendRequest>
{
    public override void Configure() => Post("/mail/send");

    public override async Task HandleAsync(SendRequest req, CancellationToken ct)
    {
        if (req.To is not { Length: > 0 } || string.IsNullOrWhiteSpace(req.Subject) || string.IsNullOrWhiteSpace(req.Body))
        {
            await Send.ResultAsync(Results.BadRequest(new { error = "To, Subject, and Body are required" }));
            return;
        }

        var sender = Resolve<ISmtpMailSender>();

        try
        {
            await sender.SendAsync(req, ct);
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status201Created));
        }
        catch (Exception)
        {
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status502BadGateway));
        }
    }
}

// ---------------------------------------------------------------------------
// POST /api/mail/summarise
// ---------------------------------------------------------------------------

internal sealed record SummariseResponse(string Summary);

internal sealed class SummariseMailEndpoint : Endpoint<AiRequest, SummariseResponse>
{
    public override void Configure() => Post("/mail/summarise");

    public override async Task HandleAsync(AiRequest req, CancellationToken ct)
    {
        var imap = Resolve<IImapMailClient>();
        var ollama = Resolve<IOllamaMailClient>();

        MessageBody body;
        try
        {
            body = await imap.GetBodyAsync(req.Folder ?? "INBOX", req.Uid, ct);
        }
        catch (Exception)
        {
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status502BadGateway));
            return;
        }

        try
        {
            var summary = await ollama.SummariseAsync(body.Body, ct);
            await Send.OkAsync(new SummariseResponse(summary), ct);
        }
        catch (Exception)
        {
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status503ServiceUnavailable));
        }
    }
}

// ---------------------------------------------------------------------------
// POST /api/mail/draft
// ---------------------------------------------------------------------------

internal sealed record DraftResponse(string Draft);

internal sealed class DraftMailEndpoint : Endpoint<AiReplyRequest, DraftResponse>
{
    public override void Configure() => Post("/mail/draft");

    public override async Task HandleAsync(AiReplyRequest req, CancellationToken ct)
    {
        var imap = Resolve<IImapMailClient>();
        var ollama = Resolve<IOllamaMailClient>();

        MessageBody body;
        try
        {
            body = await imap.GetBodyAsync(req.Folder ?? "INBOX", req.Uid, ct);
        }
        catch (Exception)
        {
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status502BadGateway));
            return;
        }

        try
        {
            var draft = await ollama.DraftReplyAsync(body.Body, body.From, req.Instruction, ct);
            await Send.OkAsync(new DraftResponse(draft), ct);
        }
        catch (Exception)
        {
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status503ServiceUnavailable));
        }
    }
}

// ---------------------------------------------------------------------------
// POST /api/mail/tag
// ---------------------------------------------------------------------------

internal sealed record TagResponse(string Tag);

internal sealed class TagMailEndpoint : Endpoint<AiRequest, TagResponse>
{
    public override void Configure() => Post("/mail/tag");

    public override async Task HandleAsync(AiRequest req, CancellationToken ct)
    {
        var imap = Resolve<IImapMailClient>();
        var ollama = Resolve<IOllamaMailClient>();
        var opts = Resolve<IOptions<MailOptions>>().Value;

        MessageBody body;
        try
        {
            body = await imap.GetBodyAsync(req.Folder ?? "INBOX", req.Uid, ct);
        }
        catch (Exception)
        {
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status502BadGateway));
            return;
        }

        try
        {
            var tag = await ollama.TagAsync(body.Body, opts.Tags, ct);
            await Send.OkAsync(new TagResponse(tag), ct);
        }
        catch (Exception)
        {
            await Send.ResultAsync(Results.StatusCode(StatusCodes.Status503ServiceUnavailable));
        }
    }
}
