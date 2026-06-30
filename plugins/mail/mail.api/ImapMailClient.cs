using System.Text.RegularExpressions;
using MailKit;
using MailKit.Net.Imap;
using MailKit.Search;
using Microsoft.Extensions.Options;
using MimeKit;

namespace Pcc.Plugins.Mail;

internal sealed partial class ImapMailClient(IOptions<MailOptions> opts) : IImapMailClient
{
    private readonly MailOptions _opts = opts.Value;

    public async Task<IReadOnlyList<MessageHeader>> GetHeadersAsync(
        string folder, int limit, int offset, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(_opts.Imap.Host))
        {
            throw new InvalidOperationException("IMAP not configured");
        }

        using var client = new ImapClient();
        await ConnectAsync(client, ct);

        var mailbox = await client.GetFolderAsync(_opts.Imap.Resolve(folder), ct);
        await mailbox.OpenAsync(FolderAccess.ReadOnly, ct);

        var uids = await mailbox.SearchAsync(SearchQuery.All, ct);
        // Newest-first: reverse the uid list, then page
        var paged = uids
            .Reverse()
            .Skip(offset)
            .Take(limit)
            .ToList();

        var headers = new List<MessageHeader>(paged.Count);
        foreach (var uid in paged)
        {
            var summary = await mailbox.FetchAsync(
                [uid],
                MessageSummaryItems.UniqueId |
                MessageSummaryItems.Envelope |
                MessageSummaryItems.Flags,
                ct);
            if (summary.Count == 0)
            {
                continue;
            }

            var s = summary[0];
            headers.Add(new MessageHeader(
                s.UniqueId.Id,
                s.Envelope?.Subject ?? "(no subject)",
                s.Envelope?.From?.ToString() ?? "",
                s.Envelope?.To?.ToString() ?? "",
                s.Envelope?.Date ?? DateTimeOffset.UtcNow,
                !s.Flags.HasValue || !s.Flags.Value.HasFlag(MessageFlags.Seen),
                null,
                folder));
        }

        await client.DisconnectAsync(true, ct);
        return headers;
    }

    public async Task<MessageBody> GetBodyAsync(string folder, uint uid, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(_opts.Imap.Host))
        {
            throw new InvalidOperationException("IMAP not configured");
        }

        using var client = new ImapClient();
        await ConnectAsync(client, ct);

        var mailbox = await client.GetFolderAsync(_opts.Imap.Resolve(folder), ct);
        await mailbox.OpenAsync(FolderAccess.ReadOnly, ct);

        var message = await mailbox.GetMessageAsync(new UniqueId(uid), ct);

        var bodyText = message.TextBody
            ?? StripHtml(message.HtmlBody ?? "");

        var attachments = message.Attachments
            .Select(a =>
            {
                long size = 0;
                if (a is MimePart part)
                {
                    size = part.Content?.Stream?.Length ?? 0;
                }

                return new AttachmentInfo(a.ContentDisposition?.FileName ?? "attachment", size);
            })
            .ToList();

        var isRead = false; // GetMessage doesn't return flags; optimistic
        return new MessageBody(
            uid,
            message.Subject ?? "(no subject)",
            message.From?.ToString() ?? "",
            message.To?.ToString() ?? "",
            message.Date,
            isRead,
            bodyText,
            attachments,
            folder);
    }

    private async Task ConnectAsync(ImapClient client, CancellationToken ct)
    {
        var imap = _opts.Imap;
        await client.ConnectAsync(imap.Host, imap.Port, MailKit.Security.SecureSocketOptions.Auto, ct);
        await client.AuthenticateAsync(imap.Username, imap.Password, ct);
    }

    private static string StripHtml(string html) =>
        HtmlTagRegex().Replace(html, "");

    [GeneratedRegex("<[^>]*>")]
    private static partial Regex HtmlTagRegex();
}
