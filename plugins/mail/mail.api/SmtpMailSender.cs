using MailKit.Net.Smtp;
using Microsoft.Extensions.Options;
using MimeKit;
using MimeKit.Text;

namespace Pcc.Plugins.Mail;

internal sealed class SmtpMailSender(IOptions<MailOptions> opts) : ISmtpMailSender
{
    private readonly MailOptions _opts = opts.Value;

    public async Task SendAsync(SendRequest req, CancellationToken ct)
    {
        var message = new MimeMessage();
        message.From.Add(MailboxAddress.Parse(_opts.Imap.Username));
        foreach (var to in req.To)
        {
            message.To.Add(MailboxAddress.Parse(to));
        }

        message.Subject = req.Subject;

        if (!string.IsNullOrEmpty(req.ReplyToMessageId))
        {
            message.InReplyTo = req.ReplyToMessageId;
            message.References.Add(req.ReplyToMessageId);
        }

        message.Body = new TextPart(TextFormat.Plain) { Text = req.Body };

        using var client = new SmtpClient();
        var smtp = _opts.Smtp;
        await client.ConnectAsync(smtp.Host, smtp.Port, MailKit.Security.SecureSocketOptions.Auto, ct);
        await client.AuthenticateAsync(smtp.Username, smtp.Password, ct);
        await client.SendAsync(message, ct);
        await client.DisconnectAsync(true, ct);
    }
}
